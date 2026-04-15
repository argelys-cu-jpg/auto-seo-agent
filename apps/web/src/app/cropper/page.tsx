import { ImageCropperTool } from "../../components/image-cropper-tool";
import { PageShell } from "../../components/page-shell";

export default function CropperPage() {
  return (
    <PageShell title="CookUnity Image Cropper">
      <ImageCropperTool />
    </PageShell>
  );
}
