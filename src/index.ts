import { logger } from './logger';
import { setupScreen } from './setupScreen';

const debug = logger('index.ts');

const gWindow = window as Window & { _game_loaded_?: boolean };

if (gWindow._game_loaded_) {
  window.location.reload();
}

window.onload = async () => {
  gWindow._game_loaded_ = true;
  debug('window loaded');

  setupScreen();
};
