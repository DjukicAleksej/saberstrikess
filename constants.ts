/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */


import { CutDirection, NoteData } from "./types";
import * as THREE from 'three';

// Game World Config
export const TRACK_LENGTH = 50;
export const SPAWN_Z = -30;
export const PLAYER_Z = 0;
export const MISS_Z = 5;
export const NOTE_SPEED = 10;
export const LANE_WIDTH = 0.8;
export const LAYER_HEIGHT = 0.8;
export const NOTE_SIZE = 0.5;

// Difficulty Speeds
export const SPEED_EASY = 8;
export const SPEED_MEDIUM = 10;
export const SPEED_HARD = 15;

// Positions for the 4 lanes (centered around 0)
export const LANE_X_POSITIONS = [-1.5 * LANE_WIDTH, -0.5 * LANE_WIDTH, 0.5 * LANE_WIDTH, 1.5 * LANE_WIDTH];
export const LAYER_Y_POSITIONS = [0.8, 1.6, 2.4]; // Low, Mid, High

// Audio
export const SONG_URL = 'https://commondatastorage.googleapis.com/codeskulptor-demos/riceracer_assets/music/race2.ogg';
export const HIT_SOUND_URL = 'https://commondatastorage.googleapis.com/codeskulptor-assets/Collision8-Bit.ogg';
export const SONG_BPM = 140;
const BEAT_TIME = 60 / SONG_BPM; // This is a baseline, we'll calc real rhythm from time

/**
 * Generates a rhythmic, pattern-based chart.
 * @param duration Duration of the song in seconds.
 * @returns NoteData[]
 */
export const generateRandomChart = (duration: number = 180): NoteData[] => {
  const notes: NoteData[] = [];
  let idCount = 0;

  // Assume a default tempo if we don't know it, usually 120-140 is good for action.
  const BPM = 130;
  const BEAT = 60 / BPM;

  const startTime = 2;
  const endTime = Math.max(startTime, duration - 3);

  let currentTime = startTime;

  // Pattern Functions
  type PatternGen = (time: number) => number; // Returns new time

  const patterns: PatternGen[] = [
    // 1. Basic Alternating (Left/Right)
    (t) => {
      const beats = 8;
      for (let i = 0; i < beats; i++) {
        notes.push({
          id: `note-${idCount++}`,
          time: t + (i * BEAT),
          lineIndex: i % 2 === 0 ? 1 : 2, // Mid lanes
          lineLayer: 0,
          type: i % 2 === 0 ? 'left' : 'right',
          cutDirection: CutDirection.DOWN
        });
      }
      return t + (beats * BEAT);
    },

    // 2. Double Hits (Both hands)
    (t) => {
      const beats = 4;
      for (let i = 0; i < beats; i++) {
        const time = t + (i * BEAT * 2); // Slower, every other beat
        notes.push(
          { id: `note-${idCount++}`, time, lineIndex: 0, lineLayer: 1, type: 'left', cutDirection: CutDirection.ANY },
          { id: `note-${idCount++}`, time, lineIndex: 3, lineLayer: 1, type: 'right', cutDirection: CutDirection.ANY }
        );
      }
      return t + (beats * BEAT * 2);
    },

    // 3. Stream (Fast, rolling)
    (t) => {
      const beats = 16;
      const step = BEAT / 2; // Double time
      for (let i = 0; i < beats; i++) {
        const lane = i % 4; // 0, 1, 2, 3 rolling
        const type = lane < 2 ? 'left' : 'right';
        notes.push({
          id: `note-${idCount++}`,
          time: t + (i * step),
          lineIndex: lane,
          lineLayer: 0,
          type: type,
          cutDirection: CutDirection.ANY
        });
      }
      return t + (beats * step);
    },

    // 4. Jumps (Wide separation)
    (t) => {
      const beats = 4;
      for (let i = 0; i < beats; i++) {
        const time = t + (i * BEAT);
        notes.push(
          { id: `note-${idCount++}`, time, lineIndex: 0, lineLayer: 0, type: 'left', cutDirection: CutDirection.LEFT },
          { id: `note-${idCount++}`, time, lineIndex: 3, lineLayer: 0, type: 'right', cutDirection: CutDirection.RIGHT }
        );
      }
      return t + (beats * BEAT);
    },

    // 5. Short Rest
    (t) => {
      return t + (BEAT * 4); // 4 beats rest
    }
  ];

  while (currentTime < endTime) {
    // Pick a random pattern
    const patternIndex = Math.floor(Math.random() * patterns.length);
    // Execute pattern and advance time
    currentTime = patterns[patternIndex](currentTime);
  }

  return notes.sort((a, b) => a.time - b.time);
};

export const DEMO_CHART = generateRandomChart(180);

export const DIRECTION_VECTORS: Record<CutDirection, THREE.Vector3> = {
  [CutDirection.UP]: new THREE.Vector3(0, 1, 0),
  [CutDirection.DOWN]: new THREE.Vector3(0, -1, 0),
  [CutDirection.LEFT]: new THREE.Vector3(-1, 0, 0),
  [CutDirection.RIGHT]: new THREE.Vector3(1, 0, 0),
  [CutDirection.ANY]: new THREE.Vector3(0, 0, 0)
};
