// @ts-nocheck
import { motion } from 'framer-motion';
import { SceneLayout, SafeFrame, VideoText } from '@/lib/video';

export function Scene1Intro() {
  const briefText = "Early pre-production starts with an expressive but unstructured brief.";
  const words = briefText.split(" ");

  return (
    <SceneLayout className="bg-bg-dark text-text-primary">
      {/* Background Video Layer */}
      <motion.div 
        className="absolute inset-0 opacity-40 mix-blend-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 2 }}
      >
        <video 
          src={`${import.meta.env.BASE_URL}videos/particles.mp4`} 
          autoPlay 
          muted 
          loop 
          playsInline
          className="w-full h-full object-cover"
        />
      </motion.div>

      {/* Film Set Image Layer - Subtle */}
      <motion.div
        className="absolute inset-0 opacity-20"
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.2 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 5, ease: "easeOut" }}
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/film-set.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      <SafeFrame className="flex flex-col items-center justify-center">
        <motion.div className="max-w-[70%] text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={{// @ts-expect-error

              visible: {
                transition: {
                  staggerChildren: 0.08,
                }
              }
            }}
          >
            <VideoText 
              as="h2" 
              scale="heading"
              className="font-display italic text-text-secondary leading-tight"
            >
              {words.map((word, i) => (
                <motion.span
                  key={i}
                  className="inline-block mr-[1.5vw]"
                  variants={{// @ts-expect-error

                    hidden: { opacity: 0, y: '4vh', filter: 'blur(10px)' },
                    visible: { 
                      opacity: 1, 
                      y: 0, 
                      filter: 'blur(0px)',
                      transition: { duration: 1, ease: [0.16, 1, 0.3, 1] }
                    },
                    exit: {
                      opacity: 0,
                      filter: 'blur(10px)',
                      transition: { duration: 0.8 }
                    }
                  }}
                >
                  {word}
                </motion.span>
              ))}
            </VideoText>
          </motion.div>
        </motion.div>
        
        {/* Subtle accent line */}
        <motion.div
          className="absolute bottom-[20%] w-px bg-primary"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: '20vh', opacity: 1 }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ delay: 2, duration: 1.5, ease: "easeInOut" }}
        />
      </SafeFrame>
    </SceneLayout>
  );
}