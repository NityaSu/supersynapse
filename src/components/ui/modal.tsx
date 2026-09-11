import { cn } from "@/lib/cn";

export function Modal({
  open,
  onClose,
  children,
  className,
  maxWidth = "max-w-[560px]",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-5 opacity-0 backdrop-blur-[4px] transition-opacity",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none"
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "flex max-h-[85vh] w-full scale-95 flex-col overflow-hidden rounded-[18px] border border-line bg-elevated shadow-pop transition-transform",
          maxWidth,
          open && "scale-100",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
      {children}
    </div>
  );
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-2.5 border-t border-line px-5 py-4">
      {children}
    </div>
  );
}
