import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import FeedContent from './FeedContent';

export default function ImmersiveFeedPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 w-screen h-screen bg-[#0a0a0f] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/30" />
        </div>
      }
    >
      <FeedContent />
    </Suspense>
  );
}
