import React, { Suspense, Component, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Center } from '@react-three/drei';
import { RotateCw, AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackText?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ModelErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.error("Erro ao carregar o modelo 3D:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-[450px] h-[450px] bg-slate-900 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-slate-300 border border-slate-700">
          <AlertTriangle className="w-10 h-10 text-amber-400 mb-2" />
          <p className="font-semibold text-sm">Falha ao processar o arquivo 3D.</p>
          <p className="text-xs text-slate-400 mt-1">
            Verifique se o arquivo enviado é um modelo válido (.glb ou .gltf).
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

interface ModelProps {
  url: string;
}

function Model({ url }: ModelProps) {
  // Garante a URL absoluta para a API do Django
  const fullUrl = url.startsWith('http') ? url : `http://127.0.0.1:8000${url}`;
  const { scene } = useGLTF(fullUrl);
  return <primitive object={scene} />;
}

interface ModelViewer3DProps {
  modelUrl?: string;
}

export const ModelViewer3D: React.FC<ModelViewer3DProps> = ({ modelUrl }) => {
  if (!modelUrl) {
    return (
      <div className="w-[450px] h-[450px] bg-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-500 border border-slate-200">
        <p className="text-sm font-medium">Nenhum arquivo 3D (.glb) anexado a esta peça.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center select-none">
      <div className="relative w-[450px] h-[450px] bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-700">
        <ModelErrorBoundary>
          <Canvas
            camera={{ position: [0, 0, 4], fov: 45 }}
            gl={{ antialias: true, powerPreference: 'default' }}
          >
            {/* Iluminação de estúdio anatômico */}
            <ambientLight intensity={0.9} />
            <directionalLight position={[5, 8, 5]} intensity={1.5} />
            <directionalLight position={[-5, -5, -5]} intensity={0.6} />

            <Suspense
              fallback={
                <mesh>
                  <boxGeometry args={[0.5, 0.5, 0.5]} />
                  <meshStandardMaterial color="#475569" wireframe />
                </mesh>
              }
            >
              <Center>
                <Model url={modelUrl} />
              </Center>
            </Suspense>

            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              autoRotate={false}
            />
          </Canvas>
        </ModelErrorBoundary>

        <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm pointer-events-none">
          3D Interativo (Órbita / Zoom)
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
        <RotateCw className="w-3.5 h-3.5" /> Clique e arraste para rotacionar • Role para dar zoom
      </p>
    </div>
  );
};