import { ImageCropperTool } from "../../components/image-cropper-tool";
import { PageShell } from "../../components/page-shell";

export default function CropperPage() {
  return (
    <PageShell
      title="Image cropper"
      description="A production utility for generating consistent 1200 x 600 assets from blog pages, markdown, or uploaded images."
    >
      <ImageCropperTool />
    </PageShell>
  );
}
