import {
  CubeTexture,
  HemisphericLight,
  MeshBuilder,
  Orientation,
  Scene,
  Space,
  StandardMaterial,
  Texture,
  Vector3,
} from 'babylonjs';
import * as _ from 'lodash';
import {
  applyTo,
  clamp,
  complement,
  evolve,
  isNil,
  map,
  mapObjIndexed,
  pick,
  pipe,
  prop,
  propSatisfies,
  test,
  when,
} from 'ramda';

import { logger } from './logger';
import { MultiCube } from './MultiCube';

const debug = logger('cube-scene');
type Keys = Combokeys.Combokeys;

/** @function onNullableProp
 * apply fn to property p, if not null/undefined
 */
const onNullableProp = <T, P extends keyof T>(
  t: T,
  p: P,
  fn: (value: NonNullable<T[P]>) => any,
): void =>
  void pipe(
    // erase p's type to remove error
    prop(p as any),
    when(complement(isNil), fn),
  );

const trackKey = (keys: Keys, keyName: string) => {
  const tracker = {
    isHeld: false,
    // tslint:disable-next-line:no-empty
    stop: () => {},
  };
  keys.bind(keyName, () => (tracker.isHeld = true), 'keydown');
  keys.bind(keyName, () => (tracker.isHeld = false), 'keyup');

  tracker.stop = () => {
    keys.unbind(keyName, 'keydown');
    keys.unbind(keyName, 'keyup');
  };
  return tracker;
};
type Tracker = ReturnType<typeof trackKey>;

export const setupCubeScene = (scene: Scene, keys: Keys): (() => void) => {
  // tslint:disable-next-line:no-unused-expression
  new HemisphericLight('light1', new Vector3(1, 1, 0), scene);

  // Skybox
  const skyboxSize = 200;
  const skybox = MeshBuilder.CreateBox(
    'skyBox',
    { size: skyboxSize, sideOrientation: Orientation.CCW },
    scene,
  );
  const skyboxMaterial = new StandardMaterial('skyBox', scene);
  skyboxMaterial.backFaceCulling = true;
  skyboxMaterial.reflectionTexture = new CubeTexture(
    'assets/stormydays',
    scene,
  );
  skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
  skyboxMaterial.disableLighting = true;
  skybox.material = skyboxMaterial;

  const cubeSize = 3;
  const mc = new MultiCube(scene, 5, cubeSize);
  const cube = {
    mesh: mc.rootNode,
    direction: null as null | 'left' | 'right' | 'up' | 'down',
    rotation: 0,
  };

  // When click event is raised
  window.addEventListener('click', () => {
    // We try to pick an object
    const { pickedMesh } = scene.pick(
      scene.pointerX,
      scene.pointerY,

      propSatisfies(test(/^\d+,\d+,\d+$/), 'name'),
    )!;
    if (!pickedMesh) {
      return;
    }
    const info = mc.getInfo(pickedMesh as any);
    if (!info || info.isCorner) {
      return;
    }
    // pickedMesh.visibility = +!pickedMesh.visibility;
    if (pickedMesh.material) {
      const { material } = pickedMesh;
      // material.wireframe = !material.wireframe;
      debug('alpha %s', material.alpha);
      // material.alpha
    }
    debug(pickedMesh.isVisible);
  });

  const playerSize = 0.3;
  const player = MeshBuilder.CreateSphere(
    'player',
    { diameter: playerSize },
    scene,
  );
  const playerZ = cubeSize / 2 + playerSize;
  debug({ playerZ });
  player.position.z = playerZ;
  const trackers = {
    up: trackKey(keys, 'up'),
    left: trackKey(keys, 'left'),
    down: trackKey(keys, 'down'),
    right: trackKey(keys, 'right'),
  };

  const offset = 1; // 0.8;
  const clampPlayer = {
    x: clamp(-offset, offset),
    y: clamp(-offset, offset),
  };

  return () => {
    skybox.rotate(Vector3.Down(), 2 / 1e4);

    if (cube.direction) {
      let reset = false;
      let step = 1;

      cube.rotation += step;
      if (cube.rotation > 90) {
        step -= cube.rotation - 90;
        reset = true;
      }

      const radianStep = (step * Math.PI) / 180;

      const playerRotationFactor = 1;

      switch (cube.direction) {
        case 'left': {
          debug('spinning left', player.position.z);
          cube.mesh.rotate(Vector3.Up(), radianStep, Space.WORLD);
          player.rotateAround(
            Vector3.Zero(),
            Vector3.Up(),
            radianStep * playerRotationFactor,
          );
          skybox.rotate(Vector3.Up(), radianStep * 0.9, Space.WORLD);
          break;
        }
        case 'right': {
          debug('spinning right');
          cube.mesh.rotate(Vector3.Up(), -radianStep, Space.WORLD);
          player.rotateAround(
            Vector3.Zero(),
            Vector3.Up(),
            -radianStep * playerRotationFactor,
          );
          skybox.rotate(Vector3.Up(), -radianStep * 0.7, Space.WORLD);
          break;
        }
        case 'up': {
          debug('spinning up');
          cube.mesh.rotate(Vector3.Left(), radianStep, Space.WORLD);
          player.rotateAround(
            Vector3.Zero(),
            Vector3.Left(),
            radianStep * playerRotationFactor,
          );
          skybox.rotate(Vector3.Left(), radianStep * 0.3, Space.WORLD);
          break;
        }
        case 'down': {
          debug('spinning down');
          cube.mesh.rotate(Vector3.Left(), -radianStep, Space.WORLD);
          player.rotateAround(
            Vector3.Zero(),
            Vector3.Left(),
            -radianStep * playerRotationFactor,
          );

          skybox.rotate(Vector3.Left(), -radianStep * 1.2, Space.WORLD);
          break;
        }
      }

      if (reset) {
        cube.direction = null;
        cube.rotation = 0;
        player.position.z = playerZ;

        onNullableProp(player, 'rotationQuaternion', (quaternion) => {
          quaternion.set(0, 0, 0, 0);
        });
      }
    } else {
      const heldKeys = map(prop<Tracker, 'isHeld'>('isHeld'), trackers);

      const playerStep = new Vector3(
        +heldKeys.left - +heldKeys.right,
        +heldKeys.up - +heldKeys.down,
      );

      if (playerStep.lengthSquared() > 0) {
        playerStep.normalize();
        player.translate(playerStep, 1 / 60);
      }
    }

    const { position } = player;

    const atBounds = pipe(
      pick<Vector3, 'x' | 'y'>(['x', 'y']),
      evolve(clampPlayer),
      mapObjIndexed(
        pipe(
          (value: number, key: string) => (pos: any) =>
            Math.sign(value - pos[key]),
          applyTo(position),
        ),
      ),
    )(position);

    _.update(position, 'x', clampPlayer.x);
    _.update(position, 'y', clampPlayer.y);

    if (!cube.direction) {
      if (atBounds.x > 0) {
        cube.direction = 'left';
      } else if (atBounds.x < 0) {
        cube.direction = 'right';
      } else if (atBounds.y > 0) {
        cube.direction = 'up';
      } else if (atBounds.y < 0) {
        cube.direction = 'down';
      }
    }
  };
};
