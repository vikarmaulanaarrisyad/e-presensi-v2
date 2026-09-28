import Swal from "sweetalert2";

/**
 * Custom SweetAlert2 instance tailored for Kemenag UI theme
 * Primary: #0A5C36 (Emerald Green), Accent: #D4AF37 (Gold)
 */
export const customSwal = Swal.mixin({
  customClass: {
    popup: "rounded-2xl border border-border shadow-2xl font-sans",
    title: "text-lg font-bold text-foreground",
    htmlContainer: "text-xs text-muted-foreground leading-relaxed",
    confirmButton:
      "inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#0A5C36] hover:bg-[#08482a] text-white text-xs font-semibold shadow-md transition-all outline-none mx-1.5 cursor-pointer",
    cancelButton:
      "inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold border border-border transition-all outline-none mx-1.5 cursor-pointer",
  },
  buttonsStyling: false,
});

/**
 * Show a success alert with animated green checkmark
 */
export const swalSuccess = (title: string, text?: string, timer = 2500) => {
  return customSwal.fire({
    icon: "success",
    title,
    text,
    timer,
    timerProgressBar: true,
    showConfirmButton: false,
    iconColor: "#10b981",
  });
};

/**
 * Show an error alert with animated red cross
 */
export const swalError = (title: string, text?: string) => {
  return customSwal.fire({
    icon: "error",
    title,
    text: text || "Terjadi kesalahan saat memproses permintaan Anda.",
    confirmButtonText: "Mengerti",
    iconColor: "#ef4444",
  });
};

/**
 * Show a warning alert with animated amber exclamation
 */
export const swalWarning = (title: string, text?: string) => {
  return customSwal.fire({
    icon: "warning",
    title,
    text,
    confirmButtonText: "Tutup",
    iconColor: "#f59e0b",
  });
};

/**
 * Show a persistent loading modal with animated spinner
 */
export const swalLoading = (title = "Mohon Tunggu...", text = "Sedang memproses data...") => {
  customSwal.fire({
    title,
    text,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
};

/**
 * Programmatically close any active SweetAlert
 */
export const swalClose = () => {
  Swal.close();
};

/**
 * Show a confirmation modal dialog (Yes/No)
 * Returns true if confirmed, false otherwise
 */
export const swalConfirm = async (
  title: string,
  text: string,
  confirmButtonText = "Ya, Lanjutkan",
  cancelButtonText = "Batal"
): Promise<boolean> => {
  const result = await customSwal.fire({
    icon: "warning",
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    iconColor: "#f59e0b",
  });

  return result.isConfirmed;
};

export default customSwal;
