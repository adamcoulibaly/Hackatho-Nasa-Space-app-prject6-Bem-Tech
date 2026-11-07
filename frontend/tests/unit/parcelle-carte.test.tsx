import { render, screen, waitFor, act } from "@testing-library/react";
import { ParcelleProvider, useParcelle } from "@/lib/parcelle/context";
import { ParcelleForm } from "@/components/ParcelleForm";
import { DEFAULT_PARCELLE, ParcelleSchema } from "@/lib/parcelle/validate";

let api: ReturnType<typeof useParcelle> | null = null;
function Espion() {
  api = useParcelle();
  return null;
}

describe("parcelle dessinée sur la carte", () => {
  beforeEach(() => localStorage.clear());

  it("le schéma accepte un contour et un centre", () => {
    const p = ParcelleSchema.parse({ ...DEFAULT_PARCELLE, contour: [[9.46, -5.63], [9.47, -5.63], [9.47, -5.62]], centre: [9.465, -5.625] });
    expect(p.contour).toHaveLength(3);
  });

  it("le champ Surface suit la surface calculée par le dessin", async () => {
    render(<ParcelleProvider><Espion /><ParcelleForm onSubmit={() => {}} /></ParcelleProvider>);
    await waitFor(() => expect(screen.getByLabelText("Surface (ha)")).toHaveValue(2));
    act(() => api!.setParcelle({ surface: 3.25 }));
    await waitFor(() => expect(screen.getByLabelText("Surface (ha)")).toHaveValue(3.25));
  });
});
