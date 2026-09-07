import { motion, AnimatePresence } from 'framer-motion';
import { SceneLayout, SafeFrame, VideoText } from '@/lib/video';
import { useEffect, useState } from 'react';

const SPECIALISTS = [
  { role: "Creative Director", output: "Treatment & Overview", delay: 0 },
  { role: "Writer", output: "Script Scenes", delay: 3000 },
  { role: "Art Director", output: "Visual Direction", delay: 6000 },
  { role: "Production Planner", output: "Plan & Shot List", delay: 9000 },
  { role: "Creative QA", output: "Quality Validation", delay: 12000 },
];

export function Scene3Specialists() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timers = SPECIALISTS.map((s, i) => 
      setTimeout(() => setIndex(i), s.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <SceneLayout className="bg-bg-dark text-text-primary">
      {/* Background with abstract crystal */}
      <motion.div
        className="absolute inset-0 opacity-20"
        initial={{ scale: 1, filter: "hue-rotate(0deg)" }}
        animate={{ scale: 1.1, filter: "hue-rotate(15deg)" }}
        exit={{ opacity: 0 }}
        transition={{ duration: 16, ease: "linear" }}
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/crystal.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          mixBlendMode: 'lighten'
        }}
      />
      
      <SafeFrame className="flex flex-col items-center justify-center">
        {/* Top Header */}
        <motion.div
          className="absolute top-[10%] w-full text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
        >
          <VideoText scale="caption" className="font-mono text-primary uppercase tracking-widest">
            Gemini 3.6 Flash / Sequential Handoff
          </VideoText>
        </motion.div>

        {/* Dynamic Nodes */}
        <div className="relative w-full h-full flex items-center justify-center">
          
          {/* Central Connecting Node Line */}
          <motion.div 
            className="absolute left-1/2 -translate-x-1/2 top-[20%] bottom-[20%] w-px bg-bg-muted"
            initial={{ height: 0 }}
            animate={{ height: '60%' }}
            transition={{ duration: 1 }}
          >
            {/* Moving pulse on line */}
            <motion.div 
              className="w-full bg-primary h-[5vw] rounded-full blur-[4px] box-glow-primary"
              animate={{ y: ['0%', '500%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              className="absolute w-full flex items-center justify-center gap-[4vw]"
              initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Left Side: Role */}
              <div className="w-[40%] text-right flex flex-col items-end">
                <VideoText scale="caption" className="font-mono text-text-muted mb-[1vh]">Agent {index + 1}</VideoText>
                <VideoText scale="heading" className="font-display text-text-primary leading-none text-glow">{SPECIALISTS[index].role}</VideoText>
              </div>
              
              {/* Center Node */}
              <div className="w-[4vw] h-[4vw] rounded-full border-[0.2vw] border-primary bg-bg-dark z-10 flex items-center justify-center box-glow-primary">
                <div className="w-[2vw] h-[2vw] rounded-full bg-primary" />
              </div>

              {/* Right Side: Output */}
              <div className="w-[40%] text-left flex flex-col items-start">
                <VideoText scale="caption" className="font-mono text-primary mb-[1vh]">Produces</VideoText>
                <VideoText scale="heading" className="font-sans uppercase tracking-wider text-text-secondary">{SPECIALISTS[index].output}</VideoText>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress Dots */}
        <div className="absolute bottom-[10%] flex gap-[1vw]">
          {SPECIALISTS.map((_, i) => (
            <motion.div 
              key={i}
              className="w-[1vw] h-[1vw] rounded-full border border-primary/50"
              animate={{
                backgroundColor: i === index ? 'var(--color-primary)' : 'transparent',
                scale: i === index ? 1.2 : 1,
                boxShadow: i === index ? '0 0 10px rgba(235,20,20,0.8)' : 'none'
              }}
              transition={{ duration: 0.4 }}
            />
          ))}
        </div>
      </SafeFrame>
    </SceneLayout>
  );
}