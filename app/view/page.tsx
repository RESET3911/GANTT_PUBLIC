'use client';

import GanttApp from '@/components/GanttApp';

export default function ViewOnly() {
  return <GanttApp readOnly={true} />;
}
