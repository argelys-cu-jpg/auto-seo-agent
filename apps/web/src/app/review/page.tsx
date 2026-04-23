import { Suspense } from "react";

import { ReviewWorkspace } from "../../components/review-workspace";

export default function ReviewPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading review workspace…</div>}>
      <ReviewWorkspace />
    </Suspense>
  );
}
