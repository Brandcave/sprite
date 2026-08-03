import * as THREE from 'three';

/*
  A single planar reflection, shared by every puddle on the island.

  All the puddles lie on the same plane — grass, path and sand all sit at y = 0 —
  so one mirrored render of the scene serves the lot of them, at the cost of one
  extra pass. That is what makes real reflections affordable here: not a pass per
  puddle, a pass per frame, and only on frames where the ground is actually wet.

  Two pieces of standard planar-mirror machinery are doing the work:

  - The virtual camera is the real one reflected through the plane, with its up
    vector reflected too. Reflecting position alone gives a mirror image with the
    handedness flipped, which comes out inside-out.

  - The projection matrix is then skewed so its near plane lies exactly on the
    water. Without that, everything *below* the plane is in shot — and since the
    ground boxes hang a full unit down and the ocean sits below the shoreline,
    the reflection would be nothing but the underside of the terrain.
*/

const CLIP_BIAS = 0.004;

export class PlanarReflection {
  constructor({ height = 0.012, scale = 0.5, flatten = 0.5 } = {}) {
    this.height = height;
    this.scale = scale;
    this.flatten = flatten;   // 1 = a true mirror, less = a more grazing view

    this.target = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.UnsignedByteType,
    });
    // The pass renders a finished picture — tone-mapped and encoded, the same as
    // the canvas — so the puddle shader can mix it straight into its own final
    // colour without a second set of colour-space rules.
    this.target.texture.colorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera();
    this.textureMatrix = new THREE.Matrix4();

    this.plane = new THREE.Plane();
    this.normal = new THREE.Vector3(0, 1, 0);
    this.tmpPos = new THREE.Vector3();
    this.tmpTarget = new THREE.Vector3();
    this.tmpUp = new THREE.Vector3();
    this.clipPlane = new THREE.Vector4();
    this.q = new THREE.Vector4();
  }

  get texture() {
    return this.target.texture;
  }

  setSize(width, height) {
    this.target.setSize(
      Math.max(1, Math.floor(width * this.scale)),
      Math.max(1, Math.floor(height * this.scale)),
    );
  }

  /** @param hidden meshes to leave out of the reflection (the puddles, the weather) */
  update(renderer, scene, camera, hidden = []) {
    const h = this.height;
    const cam = this.camera;

    cam.copy(camera);

    // A true mirror of a camera looking down at 46 degrees reflects the sky and
    // almost nothing else — which is honest, and reads as a flat blue sticker.
    // Pulling the virtual camera closer to the water flattens its view, so the
    // palms and the lamps and the houses actually turn up in the puddle. It is
    // not the geometry of a real reflection; it is the geometry of one you can
    // see. The texture matrix comes from this same camera, so it stays coherent.
    const flat = this.flatten;
    cam.position.set(
      camera.position.x,
      h - (camera.position.y - h) * flat,
      camera.position.z,
    );

    // where the real camera looks, reflected and flattened to match
    camera.getWorldDirection(this.tmpTarget);
    this.tmpTarget.add(camera.position);
    this.tmpTarget.y = h - (this.tmpTarget.y - h) * flat;

    this.tmpUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    this.tmpUp.y *= -1;                       // the flip that keeps it right-handed
    cam.up.copy(this.tmpUp);
    cam.lookAt(this.tmpTarget);
    cam.updateMatrixWorld(true);
    cam.projectionMatrix.copy(camera.projectionMatrix);

    // Skew the near plane onto the water (Lengyel's oblique projection).
    this.plane.setFromNormalAndCoplanarPoint(this.normal, this.tmpPos.set(0, h, 0));
    this.plane.applyMatrix4(cam.matrixWorldInverse);
    const c = this.clipPlane.set(
      this.plane.normal.x, this.plane.normal.y, this.plane.normal.z, this.plane.constant,
    );
    const p = cam.projectionMatrix;
    this.q.set(
      (Math.sign(c.x) + p.elements[8]) / p.elements[0],
      (Math.sign(c.y) + p.elements[9]) / p.elements[5],
      -1,
      (1 + p.elements[10]) / p.elements[14],
    );
    c.multiplyScalar(2 / c.dot(this.q));
    p.elements[2] = c.x;
    p.elements[6] = c.y;
    p.elements[10] = c.z + 1 - CLIP_BIAS;
    p.elements[14] = c.w;

    // clip space -> texture space, for the puddle shader to sample with
    this.textureMatrix.set(
      0.5, 0, 0, 0.5,
      0, 0.5, 0, 0.5,
      0, 0, 0.5, 0.5,
      0, 0, 0, 1,
    );
    this.textureMatrix.multiply(cam.projectionMatrix);
    this.textureMatrix.multiply(cam.matrixWorldInverse);

    const wasVisible = hidden.map((o) => o.visible);
    for (const o of hidden) o.visible = false;

    const prevTarget = renderer.getRenderTarget();
    const prevShadow = renderer.shadowMap.enabled;
    // The mirrored camera sits as far below the ground as the real one is above
    // it, so everything it looks at is half again as distant — and in rain, with
    // the fog pulled right in, the whole reflection comes back as a flat sheet
    // of fog. A mirror is not the place to be pedantic about aerial perspective.
    const prevFog = scene.fog;
    scene.fog = null;
    renderer.shadowMap.enabled = false;        // the shadow pass is already done
    renderer.setRenderTarget(this.target);
    renderer.clear();
    renderer.render(scene, cam);
    renderer.setRenderTarget(prevTarget);
    renderer.shadowMap.enabled = prevShadow;
    scene.fog = prevFog;

    hidden.forEach((o, i) => { o.visible = wasVisible[i]; });
  }
}
