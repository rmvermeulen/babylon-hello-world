import { Mesh, MeshBuilder, Scene, TransformNode } from 'babylonjs';
import { assert } from 'chai';
import { __, all, either, equals, flatten, none, times } from 'ramda';

import { logger } from './logger';

const debug = logger('multi-cube');

export class MultiCube {
  private _rootNode?: TransformNode;

  public get rootNode(): TransformNode {
    assert(this._rootNode);
    return this._rootNode!;
  }
  private cubeMap = new Map<
    string,
    {
      name: string;
      mesh?: Mesh;
      isEnabled: boolean;
    }
  >();

  private meshMap = new WeakMap<
    Mesh,
    {
      name: string;
      isEnabled: boolean;
      isCorner: boolean;
    }
  >();
  constructor(
    private scene: Scene,
    public readonly cellCount: number,
    public readonly totalSize: number,
  ) {
    debug('size before bind', this.scene, cellCount);
    this.bind(scene);
  }

  public getInfo(mesh: Mesh) {
    return this.meshMap.get(mesh);
  }
  private bind(scene: Scene) {
    if (this._rootNode) {
      this.scene.removeTransformNode(this._rootNode);
      this._rootNode = undefined;
    }
    this.scene = scene;
    // TODO: create cubes
    const cubes: Mesh[] = this.generateCubes();

    const parent = new TransformNode('mc-root', scene);
    for (const cube of cubes) {
      cube.setParent(parent);
    }
    this._rootNode = parent;

    debug('meshes merged');
    this.scene.addTransformNode(this._rootNode);
  }

  private generateCubes(): Mesh[] {
    debug(this.cellCount);
    const generate = times(__, this.cellCount);
    const cubeSize = this.totalSize / this.cellCount;
    const offset = (this.cellCount - 1) / 2;
    debug(offset);

    const isEdge = either(equals(0), equals(this.cellCount - 1));

    const meshes: Mesh[] = (flatten as any)(
      generate((z) =>
        generate((y) =>
          generate((x) => {
            const pos = [x, y, z];
            const isCorner = all(isEdge, pos);
            // must be a corner- or edge piece
            if (!isCorner && none(isEdge, pos)) {
              return;
            }
            const name = pos.join();
            let mesh: Mesh | undefined;

            mesh = MeshBuilder.CreateBox(name, {
              size: cubeSize * 0.95,
            });
            mesh.position.set(
              (x - offset) * cubeSize,
              (y - offset) * cubeSize,
              (z - offset) * cubeSize,
            );
            this.meshMap.set(mesh, {
              name,
              isEnabled: true,
              isCorner,
            });

            this.cubeMap.set(name, {
              name,
              mesh,
              isEnabled: true,
            });
            return mesh;
          }),
        ),
      ),
    ).filter(Boolean);
    const rootName = 'mc-body';
    const body = MeshBuilder.CreateBox(rootName, {
      size: this.totalSize - 2.2 * cubeSize,
    });
    this.cubeMap.set(rootName, {
      name: rootName,
      mesh: body,
      isEnabled: true,
    });
    meshes.unshift(body);
    return meshes;
  }
}
