import { ArcRotateCamera, Scene, Vector3 } from 'babylonjs';

export const setupCamera = (scene: Scene, canvas: HTMLCanvasElement) => {
  const camera = new ArcRotateCamera(
    'Camera',
    Math.PI / 2,
    Math.PI / 2,
    10,
    Vector3.Zero(),
    scene,
  );
  // camera.attachControl(canvas, true);
  return camera;
};
