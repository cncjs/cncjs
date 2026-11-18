// Release GPU resources of a removed object. Sprites share one geometry in three.js: leave it alone.
export const disposeObject = (root) => {
  root.traverse((o) => {
    if (o.geometry && !o.isSprite) {
      o.geometry.dispose();
    }
    const materials = Array.isArray(o.material) ? o.material : [o.material];
    materials.forEach((m) => {
      if (m) {
        m.map && m.map.dispose();
        m.dispose();
      }
    });
  });
};
