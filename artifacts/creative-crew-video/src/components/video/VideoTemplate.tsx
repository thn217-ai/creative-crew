// Video Template
import {
  VideoPausedContext,
  VideoCanvas,
  type VideoAspectRatio,
  useVideoPlayer,
} from '@/lib/video';
import { AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';

import { Scene1Intro } from './video_scenes/Scene1Intro';
import { Scene2Concept } from './video_scenes/Scene2Concept';
import { Scene3Specialists } from './video_scenes/Scene3Specialists';
import { Scene4Package } from './video_scenes/Scene4Package';
import { Scene5Outro } from './video_scenes/Scene5Outro';

export const SCENE_DURATIONS = {
  intro: 5000,
  concept: 6000,
  specialists: 16000,
  package: 9000,
  outro: 9000,
};

const VIDEO_ASPECT_RATIO: VideoAspectRatio = '16:9';

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  intro: Scene1Intro,
  concept: Scene2Concept,
  specialists: Scene3Specialists,
  package: Scene4Package,
  outro: Scene5Outro,
};

const SCENE_START_SEC = Object.entries(SCENE_DURATIONS).reduce(
  (result, [key, duration]) => {
    result.offsets[key] = result.total / 1000;
    result.total += duration;
    return result;
  },
  { offsets: {} as Record<string, number>, total: 0 },
).offsets;

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  paused = false,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  paused?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop, paused });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSceneKey = useRef<string | null>(null);
  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '');
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  useEffect(() => onSceneChange?.(currentSceneKey), [currentSceneKey, onSceneChange]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.45;
    if (paused) {
      audio.pause();
      return;
    }
    if (lastSceneKey.current !== currentSceneKey) {
      lastSceneKey.current = currentSceneKey;
      const target = SCENE_START_SEC[baseSceneKey] ?? 0;
      if (Math.abs(audio.currentTime - target) > 0.18) audio.currentTime = target;
    }
    audio.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey, muted, paused]);

  return (
    <VideoPausedContext.Provider value={paused}>
      <VideoCanvas
        aspectRatio={VIDEO_ASPECT_RATIO}
        style={{ backgroundColor: 'var(--color-bg-dark)' }}
      >
        <AnimatePresence mode="popLayout">
          {SceneComponent && <SceneComponent key={currentSceneKey} />}
        </AnimatePresence>
        <audio
          ref={audioRef}
          src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
          preload="auto"
          autoPlay
          muted={muted}
        />
      </VideoCanvas>
    </VideoPausedContext.Provider>
  );
}