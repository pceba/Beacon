import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { AlertCircle } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmSheet } from '../../components/ui/ConfirmSheet';
import { FormScreen } from '../../components/ui/FormScreen';
import { Switch } from '../../components/ui/Switch';
import { TextField } from '../../components/ui/TextField';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Type } from '../../constants/typography';
import { success, warning } from '../../lib/haptics';
import { invalidateTables } from '../../lib/query';
import { hasColumn } from '../../lib/schemaCaps';
import { toast } from '../../lib/toast';
import { getCurrentUserId } from '../../services/authService';
import { createEvent, deleteEvent, getEventById, updateEvent } from '../../services/eventService';
import { PlanStackParamList } from '../../types/navigation';
import { keyOf, minutesOf, timeOf } from '../../utils/dates';
import { DateField, TimeField } from './components/PickerFields';
import { durationOf, endAfter } from './planPeriods';

type Route = RouteProp<PlanStackParamList, 'EventDetailScreen'>;

const END_ERROR = 'Tiene que acabar después de empezar';

// Próxima hora en punto, para un evento nuevo sin hora.
const nextHour = () => timeOf(Math.min(23, new Date().getHours() + 1) * 60);

const Row = ({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) => (
  <View style={[styles.row, last ? null : styles.divider]}>
    <Text style={styles.rowLabel}>{label}</Text>
    {children}
  </View>
);

// Evento (DESIGN.md §8.7): título, fecha, hora y «Hasta», lugar y descripción.
export const EventDetailScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const eventId = route.params?.eventId;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(route.params?.date ?? keyOf(new Date()));
  const [allDay, setAllDay] = useState(false);
  const [time, setTime] = useState(route.params?.time ?? nextHour());
  const [end, setEnd] = useState(endAfter(route.params?.time ?? nextHour()));
  const [location, setLocation] = useState('');
  const [withEnd, setWithEnd] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let active = true;
    hasColumn('events.end_time')
      .then((value) => active && setWithEnd(value))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!eventId) return;
    let active = true;
    const load = async () => {
      try {
        const event = await getEventById(await getCurrentUserId(), eventId);
        if (!active) return;
        if (!event) {
          toast.show({ message: 'No hemos encontrado el evento.', kind: 'error' });
          navigation.goBack();
          return;
        }
        const start = event.event_time?.slice(0, 5);
        setTitle(event.title);
        setDescription(event.description ?? '');
        setDate(event.event_date.slice(0, 10));
        setAllDay(!start);
        setTime(start ?? nextHour());
        setEnd(event.end_time && start && durationOf(start, event.end_time.slice(0, 5)) ? event.end_time.slice(0, 5) : endAfter(start ?? nextHour()));
        setLocation(event.location ?? '');
      } catch (error) {
        console.error(error);
        toast.show({ message: 'No se ha podido cargar el evento.', kind: 'error' });
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [eventId, navigation]);

  // Mover el inicio arrastra el fin y conserva la duración.
  const changeTime = (next: string) => {
    const duration = durationOf(time, end) ?? 60;
    setTime(next);
    setEnd(endAfter(next, duration));
  };

  const endInvalid = !allDay && withEnd && (minutesOf(end) ?? 0) <= (minutesOf(time) ?? 0);

  const onSave = async () => {
    const name = title.trim();
    if (!name) {
      setTitleError('Ponle un nombre.');
      return;
    }
    if (endInvalid) return;
    setSaving(true);
    try {
      const userId = await getCurrentUserId();
      const payload = {
        title: name,
        description: description.trim() || null,
        event_date: date,
        event_time: allDay ? null : time,
        // Sin la columna en el servidor, el servicio la quita del envío.
        end_time: allDay || !withEnd ? null : end,
        location: location.trim() || null,
      };
      if (eventId) await updateEvent(userId, eventId, payload);
      else await createEvent(userId, payload);
      void invalidateTables('events');
      success();
      navigation.goBack();
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se ha guardado el evento.', kind: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!eventId) return;
    setConfirming(false);
    try {
      await deleteEvent(await getCurrentUserId(), eventId);
      warning();
      void invalidateTables('events');
      navigation.goBack();
      toast.show({ message: 'Evento eliminado' });
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se ha podido eliminar.', kind: 'error' });
    }
  };

  return (
    <FormScreen
      title="Evento"
      saveLabel="Guardar evento"
      onSave={() => void onSave()}
      loading={saving}
      footer={eventId ? <Button title="Eliminar evento" variant="danger" onPress={() => setConfirming(true)} /> : null}
    >
      <TextField
        label="Título"
        value={title}
        onChangeText={(next) => {
          setTitle(next);
          if (titleError) setTitleError('');
        }}
        placeholder="Clase, dentista…"
        error={titleError}
      />
      <Card inset>
        <Row label="Fecha">
          <DateField label="Fecha" value={date} onChange={setDate} />
        </Row>
        <Row label="Todo el día" last={allDay}>
          <Switch label="Todo el día" value={allDay} onValueChange={setAllDay} />
        </Row>
        {!allDay ? (
          <Row label="Hora" last={!withEnd}>
            <TimeField label="Hora" value={time} onChange={changeTime} />
          </Row>
        ) : null}
        {!allDay && withEnd ? (
          <Row label="Hasta" last>
            <TimeField label="Hasta" value={end} onChange={setEnd} />
          </Row>
        ) : null}
      </Card>
      {endInvalid ? (
        <View style={styles.error} accessibilityLiveRegion="polite">
          <View style={styles.errorIcon}>
            <AlertCircle color={Colors.danger} size={16} />
          </View>
          <Text style={styles.errorText}>{END_ERROR}</Text>
        </View>
      ) : null}
      <TextField label="Lugar" value={location} onChangeText={setLocation} placeholder="Opcional" />
      <TextField label="Descripción" value={description} onChangeText={setDescription} placeholder="Opcional" multiline numberOfLines={4} />
      <ConfirmSheet
        visible={confirming}
        title="¿Eliminar el evento?"
        body="Se borra del plan y no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={() => void onDelete()}
        onClose={() => setConfirming(false)}
      />
    </FormScreen>
  );
};

const styles = StyleSheet.create({
  row: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.line },
  rowLabel: { ...Type.body, color: Colors.ink },
  error: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  errorIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  errorText: { ...Type.caption, color: Colors.danger, flex: 1 },
});
