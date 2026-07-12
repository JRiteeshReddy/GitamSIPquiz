import type { ItemConfig, RoundConfig } from './types';

const ALL_ASSETS = [
  { normal: '/img/ball (1).png', target: '/img/ball (2).png', alt: 'ball' },
  { normal: '/img/banana (1).png', target: '/img/banana (2).png', alt: 'banana' },
  { normal: '/img/bottle (1).png', target: '/img/bottle (2).png', alt: 'bottle' },
  { normal: '/img/car (1).png', target: '/img/car (2).png', alt: 'car' },
  { normal: '/img/clock (1).png', target: '/img/clock (2).png', alt: 'clock' },
  { normal: "/img/phone' (1).png", target: "/img/phone' (2).png", alt: 'phone' },
  { normal: '/img/1.png', target: '/img/2.png', alt: 'item7' },
];
const ITEM_COUNT = 7;

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateRandomRound(): RoundConfig {
  const targetSide = Math.random() > 0.5 ? 'left' : 'right';
  const targetIndex = Math.floor(Math.random() * ITEM_COUNT);
  const roundAssets = shuffle(ALL_ASSETS).slice(0, ITEM_COUNT);

  const generateSideItems = (side: 'left' | 'right'): ItemConfig[] => {
    const items: ItemConfig[] = [];
    const positions: {cx: number, cy: number}[] = [];

    roundAssets.forEach((asset, index) => {
      let x = 0, y = 0, rotation = 0;
      let isValid = false;
      let attempts = 0;
      const itemRadius = 11;
      
      while (!isValid && attempts < 500) {
        x = Math.random() * (100 - itemRadius * 2);
        y = Math.random() * (100 - itemRadius * 2);
        rotation = Math.random() * 360;
        isValid = true;

        const cx = x + itemRadius;
        const cy = y + itemRadius;
        
        const distFromCenter = (cx - 50) * (cx - 50) + (cy - 50) * (cy - 50);
        if (distFromCenter > (50 - itemRadius) * (50 - itemRadius)) {
          isValid = false;
          attempts++;
          continue;
        }

        for (const pos of positions) {
          const dx = cx - pos.cx;
          const dy = cy - pos.cy;
          if (dx * dx + dy * dy < 400) {
            isValid = false;
            break;
          }
        }
        attempts++;
      }

      positions.push({ cx: x + itemRadius, cy: y + itemRadius });
      const isVisualTarget = side === targetSide && index === targetIndex;
      const isCorrectItem = index === targetIndex;
      
      items.push({
        id: index,
        src: isVisualTarget ? asset.target : asset.normal,
        alt: asset.alt,
        cx: x + itemRadius,
        cy: y + itemRadius,
        x,
        y,
        rotation,
        isTarget: isCorrectItem,
      });
    });
    return items;
  };

  return {
    leftItems: generateSideItems('left'),
    rightItems: generateSideItems('right'),
  };
}
