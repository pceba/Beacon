import { getStored, setStored } from '../lib/storage';
import { getIdentity } from './authService';
import { migrateMoodScores } from './moodService';

const FLAG = 'lifepp_mood_migrated';

export const migrateMoodOnce = () => {
  void (async () => {
    try {
      const identity = await getIdentity();
      if ((await getStored(FLAG)) === identity.userId) return;
      await migrateMoodScores(identity.userId);
      await setStored(FLAG, identity.userId);
    } catch {
      // La migración es de fondo. Un fallo no debe interrumpir el día.
    }
  })();
};
