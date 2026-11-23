import * as THREE from 'three';

/**
 * GLSL Shader Injection for Topographic Contour Isolines & Warm Solar Scan Pulse (v3)
 * Works cleanly on Three.js MeshStandardMaterial across WebGL1 & WebGL2.
 */

export function attachTopographicGLSL(material, options = {}) {
  const uniforms = {
    uTime: { value: 0 },
    uContourColor: { value: new THREE.Color(options.contourColor || '#B6ADA2') },
    uContourAlpha: { value: options.contourAlpha ?? 0.22 },
    uPulseColor: { value: new THREE.Color(options.pulseColor || '#F25C19') },
    uPulseAlpha: { value: options.pulseAlpha ?? 0.14 }
  };

  material.userData.topoUniforms = uniforms;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uContourColor = uniforms.uContourColor;
    shader.uniforms.uContourAlpha = uniforms.uContourAlpha;
    shader.uniforms.uPulseColor = uniforms.uPulseColor;
    shader.uniforms.uPulseAlpha = uniforms.uPulseAlpha;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vTopoWorldPos;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vTopoWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;
         uniform vec3 uContourColor;
         uniform float uContourAlpha;
         uniform vec3 uPulseColor;
         uniform float uPulseAlpha;
         varying vec3 vTopoWorldPos;`
      )
      .replace(
        '#include <dithering_fragment>',
        `float topoElev = max(0.0, vTopoWorldPos.y);
         float isoDist = abs(fract(topoElev * 1.8) - 0.5);
         float isoLine = smoothstep(0.055, 0.0, isoDist) * step(0.14, topoElev);
         float radialDist = length(vTopoWorldPos.xz);
         float scanPos = mod(uTime * 3.4, 24.0);
         float radarRing = smoothstep(0.85, 0.0, abs(radialDist - scanPos)) * smoothstep(22.0, 4.0, radialDist);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, uContourColor, isoLine * uContourAlpha);
         gl_FragColor.rgb += uPulseColor * radarRing * uPulseAlpha;
         #include <dithering_fragment>`
      );
  };

  return uniforms;
}
