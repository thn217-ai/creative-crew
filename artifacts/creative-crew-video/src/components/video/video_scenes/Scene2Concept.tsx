import { motion } from 'framer-motion';
import { SceneLayout, SafeFrame, VideoText } from '@/lib/video';
import { useEffect, useState } from 'react';

export function Scene2Concept() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1500); // 1 Brief
    const t2 = setTimeout(() => setPhase(2), 2500); // 5 Specialists
    const t3 = setTimeout(() => setPhase(3), 3500); // 1 Package
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
    };
  }, []);

  return (
    <SceneLayout className="bg-bg-dark text-text-primary">
      {/* Background with network nodes */}
      <motion.div
        className="absolute inset-0 opacity-30"
        initial={{ scale: 1.2, rotate: 5 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 1.1, opacity: 0 }}
        transition={{ duration: 6, ease: "easeOut" }}
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/network.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          mixBlendMode: 'screen'
        }}
      />
      
      {/* Red accent glow */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] rounded-full bg-primary/20 blur-[100px]"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ opacity: 0, scale: 0.5 }}
        transition={{ duration: 2 }}
      />

      <SafeFrame className="flex flex-col items-center justify-center">
        {/* Title */}
        <motion.div
          className="absolute top-[20%]"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <VideoText as="h1" scale="display" className="font-display tracking-tight text-glow text-center">
            Creative Crew
          </VideoText>
        </motion.div>

        {/* Dynamic Concept Text */}
        <div className="relative w-full h-[30vh] flex items-center justify-center overflow-hidden perspective-[1000px]">
          {/* Phase 0: empty state waiting */}
          
          <motion.div
            className="absolute flex flex-col items-center gap-[1vh]"
            initial={{ opacity: 0, rotateX: 90, z: -200 }}
            animate={phase === 1 ? { opacity: 1, rotateX: 0, z: 0 } : { opacity: 0, rotateX: -90, z: 200 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <VideoText scale="display" className="font-mono text-primary">1</VideoText>
            <VideoText scale="heading" className="font-sans uppercase tracking-widest text-text-secondary">Filmmaking Brief</VideoText>
          </motion.div>

          <motion.div
            className="absolute flex flex-col items-center gap-[1vh]"
            initial={{ opacity: 0, rotateX: 90, z: -200 }}
            animate={phase === 2 ? { opacity: 1, rotateX: 0, z: 0 } : { opacity: 0, rotateX: -90, z: 200 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <VideoText scale="display" className="font-mono text-primary text-glow-primary">5</VideoText>
            <VideoText scale="heading" className="font-sans uppercase tracking-widest text-text-primary text-glow">Google ADK Specialists</VideoText>
          </motion.div>

          <motion.div
            className="absolute flex flex-col items-center gap-[1vh]"
            initial={{ opacity: 0, rotateX: 90, z: -200 }}
            animate={phase === 3 ? { opacity: 1, rotateX: 0, z: 0 } : phase > 3 ? { opacity: 0, rotateX: -90, z: 200 } : { opacity: 0, rotateX: 90, z: -200 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <VideoText scale="display" className="font-mono text-primary">1</VideoText>
            <VideoText scale="heading" className="font-sans uppercase tracking-widest text-text-secondary">Pre-Production Package</VideoText>
          </motion.div>
        </div>

        {/* Small clapperboard icon popping in at the end */}
        <motion.div
          className="absolute bottom-[20%] w-[10vw] h-[10vw]"
          initial={{ opacity: 0, scale: 0, rotate: -20 }}
          animate={phase === 3 ? { opacity: 0.8, scale: 1, rotate: 0 } : { opacity: 0, scale: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 50 }}
          transition={{ duration: 1, type: "spring", stiffness: 200, damping: 20 }}
          style={{
            backgroundImage: `url(${import.meta.env.BASE_URL}images/clapperboard.png)`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            filter: 'drop-shadow(0 0 20px rgba(235,20,20,0.5))'
          }}
        />
      </SafeFrame>
    </SceneLayout>
  );
}