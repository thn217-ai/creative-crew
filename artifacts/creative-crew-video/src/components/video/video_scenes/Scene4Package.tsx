import { motion } from 'framer-motion';
import { SceneLayout, SafeFrame, VideoText } from '@/lib/video';
import { useEffect, useState } from 'react';

export function Scene4Package() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1500); // UI
    const t2 = setTimeout(() => setPhase(2), 4000); // Final text
    return () => {
      clearTimeout(t1); clearTimeout(t2);
    };
  }, []);

  const jsonSnippet = `{
  "title": "Neon Nights",
  "logline": "A hacker discovers...",
  "script": { "duration": 60, "scenes": [...] },
  "visualDirection": { "palette": [...] },
  "productionPlan": { "shots": [...] },
  "creativeQa": { "status": "APPROVED" }
}`;

  return (
    <SceneLayout className="bg-bg-dark text-text-primary">
      <SafeFrame className="flex flex-col items-center justify-center">
        
        {/* Phase 0: JSON / Validation */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={phase === 0 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <VideoText scale="heading" className="font-display mb-[4vh] text-glow">Strict Zod Validation</VideoText>
          <div className="bg-bg-muted border border-border p-[3vw] rounded-[1vw] text-left">
            <pre className="font-mono text-[2vw] text-primary whitespace-pre-wrap leading-relaxed">
              {jsonSnippet}
            </pre>
          </div>
        </motion.div>

        {/* Phase 1: The UI / Package */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center"
          initial={{ opacity: 0, y: '10vh' }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: '10vh' }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Mock UI Card */}
          <div className="w-[80vw] h-[60vh] bg-bg-muted/80 backdrop-blur-xl border border-primary/20 rounded-[2vw] p-[4vw] flex flex-col gap-[3vh] box-glow-primary">
            <div className="flex items-center gap-[2vw]">
              <div className="w-[8vw] h-[2vw] rounded-full bg-primary/20 border border-primary text-primary font-mono text-[1vw] flex items-center justify-center tracking-widest">
                APPROVED
              </div>
              <VideoText scale="caption" className="font-mono text-text-muted">Pre-Production Package</VideoText>
            </div>
            
            <VideoText scale="heading" className="font-display">Neon Nights</VideoText>
            
            <div className="w-[4vw] h-px bg-primary my-[1vh]" />
            
            <div className="grid grid-cols-2 gap-[4vw]">
              <div className="space-y-[1vh]">
                <div className="w-[20vw] h-[1.5vw] bg-text-secondary/20 rounded" />
                <div className="w-[18vw] h-[1.5vw] bg-text-secondary/20 rounded" />
                <div className="w-[22vw] h-[1.5vw] bg-text-secondary/20 rounded" />
              </div>
              <div className="space-y-[1vh]">
                <div className="w-[22vw] h-[1.5vw] bg-text-secondary/20 rounded" />
                <div className="w-[15vw] h-[1.5vw] bg-text-secondary/20 rounded" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Phase 2: Final Text overlaying UI */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-bg-dark/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={phase === 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1 }}
        >
          <VideoText scale="heading" className="font-sans uppercase tracking-[0.2em] text-center text-text-primary text-glow font-semibold leading-tight">
            One Structured <br/>
            <span className="text-primary text-glow-primary">Pre-Production Package</span>
          </VideoText>
        </motion.div>

      </SafeFrame>
    </SceneLayout>
  );
}