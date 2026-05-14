import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';
import { Suspense } from 'react';

export const HomeGradient = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      <Suspense fallback={null}>
        <ShaderGradientCanvas
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none'
          }}
          fov={40}
          pixelRatio={1}
        >
          <ShaderGradient
            control="props"
            animate="on"
            axesHelper="off"
            bgColor1="#000000"
            bgColor2="#000000"
            brightness={1.5}
            cAzimuthAngle={138}
            cDistance={1.5}
            cPolarAngle={109}
            cameraZoom={0.99}
            color1="#809bd6"
            color2="#910aff"
            color3="#af38ff"
            destination="onCanvas"
            embedMode="off"
            envPreset="city"
            fov={40}
            gizmoHelper="hide"
            grain="on"
            lightType="3d"
            positionX={0}
            positionY={-2.2}
            positionZ={0}
            range="disabled"
            reflection={0.5}
            rotationX={-10}
            rotationY={-30}
            rotationZ={210}
            shader="defaults"
            type="sphere"
            uAmplitude={7}
            uDensity={1.9}
            uFrequency={5.5}
            uSpeed={0.1}
            uStrength={0.6}
            uTime={0}
            wireframe={false}
          />
        </ShaderGradientCanvas>
      </Suspense>
      {/* Dark overlay to ensure text contrast */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />
    </div>
  );
};
