import { motion } from 'framer-motion';
import { SceneLayout, SafeFrame, VideoText } from '@/lib/video';

export function Scene5Outro() {
  return (
    <SceneLayout className="bg-bg-dark text-text-primary">
      {/* Background Image Layer */}
      <motion.div
        className="absolute inset-0 opacity-30"
        initial={{ scale: 1.05, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.3 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 6, ease: "easeOut" }}
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/film-set.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          mixBlendMode: 'screen'
        }}
      />
      
      {/* Red accent glow */}
      <motion.div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[100vw] h-[50vw] rounded-full bg-primary/20 blur-[120px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 3 }}
      />

      <SafeFrame className="flex flex-col items-center justify-center">
        
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: '5vh' }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            className="w-[12vw] h-[12vw] mb-[4vh]"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.5, duration: 1, type: "spring" }}
            style={{
              backgroundImage: `url(${import.meta.env.BASE_URL}images/clapperboard.png)`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              filter: 'drop-shadow(0 0 30px rgba(235,20,20,0.6))'
            }}
          />
          
          <VideoText as="h1" scale="display" className="font-display tracking-tight text-glow mb-[2vh]">
            Creative Crew
          </VideoText>
          
          <VideoText scale="heading" className="font-sans uppercase tracking-[0.2em] text-primary text-glow-primary">
            Your Digital Production Team
          </VideoText>

          <motion.div 
            className="mt-[6vh] opacity-60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 2, duration: 1 }}
          >
            <VideoText scale="caption" className="font-mono text-text-muted text-center leading-relaxed">
              Powered by Google Cloud Agentic Cinema
            </VideoText>
          </motion.div>
        </motion.div>

      </SafeFrame>
    </SceneLayout>
  );
}