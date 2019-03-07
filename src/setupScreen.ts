import { CannonJSPlugin, Engine, Scene, Vector3 } from 'babylonjs';
import * as CANNON from 'cannon';
import Combokeys from 'combokeys';

import { createGUI } from './createGUI';
import { logger } from './logger';
import { setupCamera } from './setupCamera';
import { setupCubeScene } from './setupCubeScene';

const debug = logger('screen');

const getRenderCanvas = (): HTMLCanvasElement => {
  const maybeCanvas = document.getElementById('renderCanvas');
  if (maybeCanvas instanceof HTMLCanvasElement) {
    return maybeCanvas;
  }
  const canvas = new HTMLCanvasElement();
  canvas.id = 'renderCanvas';
  document.body.append(canvas);
  return canvas;
};

export const setupScreen = () => {
  debug('setup');

  const canvas = getRenderCanvas();
  const keys = new Combokeys(canvas);

  Object.assign(window, { CANNON });
  const engine = new Engine(canvas, true); // Generate the BABYLON 3D engine
  const scene = new Scene(engine);

  // const gravityVector = new Vector3(0, -9.81, 0);
  // const physicsPlugin = new CannonJSPlugin();
  // scene.enablePhysics(gravityVector, physicsPlugin);

  const updateScene = setupCubeScene(scene, keys);
  createGUI(scene, keys, engine);
  setupCamera(scene, canvas);

  engine.runRenderLoop(() => {
    updateScene();
    scene.render();
  });

  // Watch for browser/canvas resize events
  window.addEventListener('resize', () => {
    engine.resize();
  });

  return { canvas, keys };
};
