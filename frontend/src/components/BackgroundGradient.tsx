import { memo, Suspense } from 'react';
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';

export const BackgroundGradient = memo(({ show }: { show: boolean }) => {
  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000"
      style={{ 
        opacity: show ? 1 : 0,
        visibility: show ? 'visible' : 'hidden'
      }}
    >
      <Suspense fallback={null}>
        <ShaderGradientCanvas 
          key="global-shader-canvas"
          style={{ 
            position: 'absolute', 
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none'
          }}
          fov={45}
        >
          {(ShaderGradient as any)({
            control: "props",
            animate: "on",
            axesHelper: "off",
            bgColor1: "#000000",
            bgColor2: "#000000",
            brightness: 0.8,
            cAzimuthAngle: 270,
            cDistance: 0.51,
            cPolarAngle: 180,
            cameraZoom: 19.09,
            color1: "#73bfc4",
            color2: "#ff810a",
            color3: "#8da0ce",
            destination: "onCanvas",
            embedMode: "off",
            envPreset: "city",
            fov: 45,
            gizmoHelper: "hide",
            grain: "on",
            lightType: "env",
            positionX: 0,
            positionY: 0,
            positionZ: 0,
            range: "disabled",
            reflection: 0.4,
            rotationX: 0,
            rotationY: 130,
            rotationZ: 70,
            shader: "defaults",
            type: "sphere",
            uAmplitude: 3.8,
            uDensity: 0.4,
            uFrequency: 5.5,
            uSpeed: 0.1,
            uStrength: 0.3,
            uTime: 0,
            wireframe: false
          })}
        </ShaderGradientCanvas>
      </Suspense>
      <div className="absolute inset-0 bg-gradient-to-tr from-[#050505] via-transparent to-[#050505]/10 pointer-events-none" />
    </div>
  );
});

BackgroundGradient.displayName = 'BackgroundGradient';
