import { useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Barcode as BarcodeIcon,
  Printer,
  Settings2,
  AlertTriangle,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { QRCode } from "react-qr-code";
import type { ReceivedNote } from "@/types";

interface BarcodeDialogProps {
  note: ReceivedNote;
}

function QRCodeGenerator({ value }: { value: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-white p-[1px]">
      <QRCode
        size={256}
        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
        value={value}
        viewBox={`0 0 256 256`}
      />
    </div>
  );
}

export function BarcodeDialog({ note }: BarcodeDialogProps) {
  // Ref để tham chiếu đến vùng in
  const contentRef = useRef<HTMLDivElement>(null);

  // Logic tạo danh sách tem phẳng (Đồng bộ cấu trúc tạo uniqueKey bảo đảm tính duy nhất)
  const allLabels = useMemo(() => {
    return (
      note.receivedProducts?.flatMap((product, pIdx) => {
        return Array.from({ length: product.addQuantity }).map((_, index) => ({
          ...product,
          uniqueKey: `${product.productId}-${pIdx}-${index}`,
        }));
      }) || []
    );
  }, [note.receivedProducts]);

  // Nhóm tem thành từng cặp (2 tem mỗi hàng khổ 70mm giống GenBarcodeDialog)
  const labelGroups = useMemo(() => {
    const groups = [];
    for (let i = 0; i < allLabels.length; i += 2) {
      groups.push(allLabels.slice(i, i + 2));
    }
    return groups;
  }, [allLabels]);

  // Hook xử lý in từ thư viện react-to-print
  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `MaVach_${note.id}`,
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-primary text-primary hover:bg-primary/10"
          disabled={note.status !== "confirm"}
        >
          <BarcodeIcon className="w-4 h-4" /> In mã vạch
        </Button>
      </DialogTrigger>

      <DialogContent className="min-w-[95vw] max-w-[98vw] h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header - Cập nhật thông tin khổ giấy 70x20mm */}
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between bg-muted/30">
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" /> Cấu hình tem in (Khổ 70x20mm - Tem Đôi)
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* LEFT: Preview - Đồng bộ UI bố cục ngang và thành phần bên trong với GenBarcodeDialog */}
          <div className="flex-1 bg-secondary/10 p-10 overflow-y-auto flex justify-center custom-scrollbar">
            <div
              ref={contentRef}
              className="barcode-container-print"
              id="barcode-print-area"
            >
              {labelGroups.map((group, gIndex) => (
                <div key={gIndex} className="print-page-row">
                  {group.map((item) => (
                    <div key={item.uniqueKey} className="barcode-item">
                      {/* Cột trái của tem: chứa Tên và Chân trang */}
                      <div className="label-info-left">
                        <div className="product-name">{item.productName}</div>
                        <div className="footer-info">
                          <span className="sku">{item.productId}</span>
                          <span className="price">
                            {Number((item.total / item.addQuantity) || 0).toLocaleString()}đ
                          </span>
                        </div>
                      </div>
                      
                      {/* Cột phải của tem: Chứa mã QR vuông vắn */}
                      <div className="barcode-wrapper">
                        <QRCodeGenerator value={item.productId} />
                      </div>
                    </div>
                  ))}
                  {/* Fill ô trống nếu hàng chỉ có 1 tem */}
                  {group.length === 1 && (
                    <div className="barcode-item invisible" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Sidebar */}
          <div className="w-[300px] border-l bg-background p-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-widest">
                  Thông số bản in
                </h4>
                <div className="rounded-lg border p-3 space-y-2 bg-muted/10">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tổng số tem:</span>
                    <span className="font-bold text-primary">
                      {allLabels.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Số hàng in:</span>
                    <span className="font-medium">{labelGroups.length}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20 space-y-3">
                <div className="flex items-center gap-2 text-destructive font-bold text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span>LƯU Ý CÀI ĐẶT MÁY IN:</span>
                </div>
                <ul className="text-[11px] text-muted-foreground list-decimal pl-4 space-y-1">
                  <li>
                    Margins (Lề): <b>None</b>
                  </li>
                  <li>
                    Scale (Tỷ lệ): <b>100%</b>
                  </li>
                  <li>
                    Khổ giấy: <b>70mm x 20mm</b>
                  </li>
                </ul>
              </div>
            </div>

            <Button
              onClick={() => handlePrint()}
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 gap-2 shadow-lg active:scale-95 transition-transform"
              disabled={allLabels.length === 0}
            >
              <Printer className="w-5 h-5" /> In {allLabels.length} tem
            </Button>
          </div>
        </div>

        {/* Tối ưu hóa CSS Print - Đồng bộ kích thước 70x20mm và layout chia ngang */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
            .barcode-container-print {
              background: white;
              padding: 0;
              height: fit-content;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }

            .print-page-row {
              display: flex;
              width: 70mm; 
              height: 20mm; 
              gap: 2mm;
              border-bottom: 1px dashed hsl(var(--border));
              background: white;
              box-sizing: border-box;
              padding: 1mm 1mm;
              justify-content: space-between;
              align-items: center;
            }

            .barcode-item {
              width: 33mm; 
              height: 18mm; 
              display: flex;
              flex-direction: row; /* Chia ngang thành 2 phần: chữ bên trái, QR bên phải */
              justify-content: space-between;
              align-items: center;
              overflow: hidden;
              gap: 1mm;
              box-sizing: border-box;
            }

            .label-info-left {
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              height: 100%;
              flex: 1;
              min-width: 0; 
            }

            .product-name { 
              font-size: 6.5px; 
              line-height: 1.1;
              font-weight: 700; 
              text-transform: uppercase; 
              text-align: left;
              width: 100%;
              max-height: 11mm;
              display: -webkit-box;
              -webkit-line-clamp: 4;
              -webkit-box-orient: vertical;
              overflow: hidden;
              color: black;
            }

            .barcode-wrapper { 
              width: 14mm !important; 
              height: 14mm !important;
              display: flex; 
              align-items: center; 
              justify-content: center; 
              flex-shrink: 0;
            }

            .barcode-wrapper svg {
              width: 14mm !important;
              height: 14mm !important;
              image-rendering: -webkit-optimize-contrast;
              image-rendering: crisp-edges;
            }

            .footer-info { 
              display: flex; 
              flex-direction: column;
              align-items: flex-start;
              width: 100%; 
              color: black;
              line-height: 1;
            }

            .sku { font-size: 6px; font-weight: 600; }
            .price { font-size: 8px; font-weight: 900; margin-top: 1px; }

            @media print {
              @page {
                size: 70mm 20mm; 
                margin: 0 !important;
              }
              body { 
                margin: 0 !important; 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact;
              }
              .barcode-container-print {
                padding: 0 !important;
                box-shadow: none !important;
              }
              .print-page-row {
                display: flex !important;
                border-bottom: none !important;
                break-after: page !important;
                page-break-after: always !important;
                gap: 2mm !important;
              }
              .barcode-item {
                visibility: visible !important;
              }
            }
            
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { 
                background-color: hsl(var(--muted-foreground) / 0.3); 
                border-radius: 10px; 
            }
            `,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}