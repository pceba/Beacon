import React, { useEffect, useState } from 'react';
import { warning } from '../../lib/haptics';
import { toast } from '../../lib/toast';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Input } from '../../components/Input';
import { FormScreen } from '../../components/ui/FormScreen';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { createEvent, deleteEvent, getEvents, updateEvent } from '../../services/eventService';
import { getCurrentUserId } from '../../services/authService';
import { PlanStackParamList } from '../../types/navigation';

type Route = RouteProp<PlanStackParamList, 'EventDetailScreen'>;

export const EventDetailScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!route.params?.eventId) return;
      try {
        const userId = await getCurrentUserId();
        const rows = await getEvents(userId);
        const selected = rows.find((row) => row.id === route.params?.eventId);
        if (!selected) return;
        setTitle(selected.title);
        setDescription(selected.description ?? '');
        setEventDate(selected.event_date);
        setEventTime(selected.event_time ?? '');
        setLocation(selected.location ?? '');
      } catch (error) {
        console.error(error);
      }
    };
    load();
  }, [route.params?.eventId]);

  const onSave = async () => {
    try {
      const userId = await getCurrentUserId();
      const payload = { title, description: description || null, event_date: eventDate, event_time: eventTime || null, location: location || null };
      if (route.params?.eventId) await updateEvent(userId, route.params.eventId, payload);
      else await createEvent(userId, payload);
      navigation.goBack();
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se ha guardado', kind: 'error' });
    }
  };

  const onDelete = async () => {
    if (!route.params?.eventId) return;
    const snapshot = {
      title,
      description: description || null,
      event_date: eventDate,
      event_time: eventTime || null,
      location: location || null,
    };
    try {
      const userId = await getCurrentUserId();
      await deleteEvent(userId, route.params.eventId);
      warning();
      navigation.goBack();
      toast.show({
        message: 'Evento eliminado',
        action: {
          label: 'Deshacer',
          onPress: () => {
            void createEvent(userId, snapshot).catch((error) => {
              console.error(error);
              toast.show({ message: 'No se ha podido recuperar el evento.', kind: 'error' });
            });
          },
        },
      });
    } catch (error) {
      console.error(error);
      toast.show({ message: 'No se ha podido eliminar.', kind: 'error' });
    }
  };

  return (
    <FormScreen
      title="Evento"
      saveLabel={route.params?.eventId ? 'Guardar evento' : 'Guardar evento'}
      onSave={() => void onSave()}
      footer={route.params?.eventId ? <Button title="Eliminar" variant="danger" onPress={() => void onDelete()} /> : null}
    >
        <Input label="Título" value={title} onChangeText={setTitle} />
        <Input label="Descripción" value={description} onChangeText={setDescription} multiline numberOfLines={4} />
        <Input label="Fecha" value={eventDate} onChangeText={setEventDate} />
        <Input label="Hora" value={eventTime} onChangeText={setEventTime} />
        <Input label="Lugar" value={location} onChangeText={setLocation} />
    </FormScreen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
});
