import { useMemo, useRef, useState, useEffect } from "react";
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
  Loader2,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { QRCode } from "react-qr-code";
import type { ReceivedNote } from "@/types";
import { getProductById } from "@/services/api";
// Import hàm lấy chi tiết sản phẩm bạn đã viết


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
  const contentRef = useRef<HTMLDivElement>(null);
  
  // State quản lý việc mở/đóng Dialog để trigger fetch dữ liệu
  const [isOpen, setIsOpen] = useState(false);
  // State lưu trữ bản đồ giá bán lẻ: { "Mã-SP": gia_ban }
  const [salePrices, setSalePrices] = useState<Record<string, number>>({});
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);

  // Logic fetch giá bán của toàn bộ sản phẩm trong phiếu nhập
  useEffect(() => {
    if (!isOpen || !note.receivedProducts || note.receivedProducts.length === 0) return;

    const fetchSalePrices = async () => {
      setIsLoadingPrices(true);
      const priceMap: Record<string, number> = {};
      
      // Lấy danh sách ID sản phẩm duy nhất để tránh fetch trùng lặp
      const uniqueProductIds = Array.from(
        new Set(note.receivedProducts?.map((p) => p.productId))
      );

      try {
        // Chạy song song các request gọi API để tối ưu tốc độ
        await Promise.all(
          uniqueProductIds.map(async (id) => {
            try {
              const res = await getProductById(id);
              if (res.success && res.data) {
                // Lưu salePrice từ API (nếu không có thì fallback về 0)
                priceMap[id] = res.data.salePrice || 0;
              }
            } catch (err) {
              console.error(`Không thể lấy giá cho sản phẩm ${id}:`, err);
              priceMap[id] = 0; // Fallback bằng 0 nếu API lỗi
            }
          })
        );
        setSalePrices(priceMap);
      } catch (error) {
        console.error("Lỗi khi tải giá bán sản phẩm:", error);
      } finally {
        setIsLoadingPrices(false);
      }
    };

    fetchSalePrices();
  }, [isOpen, note.receivedProducts]);

  // Logic tạo danh sách tem phẳng và map thêm giá bán lẻ 'salePrice' vừa fetch được
  const allLabels = useMemo(() => {
    return (
      note.receivedProducts?.flatMap((product, pIdx) => {
        return Array.from({ length: product.addQuantity }).map((_, index) => ({
          ...product,
          // Đính kèm salePrice từ state bản đồ vào từng tem lẻ
          salePrice: salePrices[product.productId] ?? 0, 
          uniqueKey: `${product.productId}-${pIdx}-${index}`,
        }));
      }) || []
    );
  }, [note.receivedProducts, salePrices]);

  // Nhóm tem thành từng cặp (2 tem mỗi hàng khổ 70mm)
  const labelGroups = useMemo(() => {
    const groups = [];
    for (let i = 0; i < allLabels.length; i += 2) {
      groups.push(allLabels.slice(i, i + 2));
    }
    return groups;
  }, [allLabels]);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `MaVach_${note.id}`,
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
        {/* Header */}
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between bg-muted/30">
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" /> Cấu hình tem in (Khổ 70x20mm - Tem Đôi)
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* LEFT: Preview */}
          <div className="flex-1 bg-secondary/10 p-10 overflow-y-auto flex items-start justify-center custom-scrollbar relative">
            {isLoadingPrices ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 gap-2 z-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Đang tải giá bán lẻ từ sản phẩm...</span>
              </div>
            ) : (
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
                              {/* Hiển thị giá lẻ thực tế lấy từ API thay vì giá nhập gốc */}
                              {Number(item.salePrice).toLocaleString()}đ
                            </span>
                          </div>
                        </div>
                        
                        {/* Cột phải của tem: Chứa mã QR */}
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
            )}
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
                  <li>Margins (Lề): <b>None</b></li>
                  <li>Scale (Tỷ lệ): <b>100%</b></li>
                  <li>Khổ giấy: <b>70mm x 20mm</b></li>
                </ul>
              </div>
            </div>

            <Button
              onClick={() => handlePrint()}
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 gap-2 shadow-lg active:scale-95 transition-transform"
              disabled={allLabels.length === 0 || isLoadingPrices}
            >
              <Printer className="w-5 h-5" /> In {allLabels.length} tem
            </Button>
          </div>
        </div>

        {/* Tối ưu hóa CSS Print */}
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
              flex-direction: row;
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