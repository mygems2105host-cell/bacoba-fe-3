import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Barcode as BarcodeIcon, Printer, Settings2 } from "lucide-react";
import Barcode from "react-barcode";
import type { ReceivedNote } from "@/types";

interface BarcodeDialogProps {
  note: ReceivedNote;
}

export function BarcodeDialog({ note }: BarcodeDialogProps) {
  // States cấu hình in ấn
  const [paperSize, setPaperSize] = useState("2t"); // Khổ 2 tem
  // const [copyCount, setCopyCount] = useState(1); // Bản sao

  // 1. Logic tạo danh sách tem dựa trên số lượng thực tế
  const allLabels = useMemo(() => {
    return (
      note.receivedProducts?.flatMap((product: any) => {
        return Array.from({ length: product.addQuantity }).map((_, index) => ({
          ...product,
          uniqueKey: `${product.id}-${index}`,
        }));
      }) || []
    );
  }, [note.receivedProducts]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={note.status !== "confirm"}
        >
          <BarcodeIcon className="w-4 h-4" /> In mã vạch
        </Button>
      </DialogTrigger>

      <DialogContent className="min-w-[90vw] max-w-[95vw] min-h-[80vh] max-h-[85vh]  p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between bg-muted/30">
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" /> Cấu hình in mã vạch
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* LEFT: Khu vực Preview (Xem trước) */}
          <div className="flex-1 bg-secondary/20 p-8 overflow-y-auto flex justify-center">
            <div
              id="barcode-print-area"
              className={`grid gap-2 bg-secondary p-4 shadow-lg h-fit ${
                paperSize === "2t" ? "grid-cols-2" : "grid-cols-1"
              }`}
              style={{
                width: paperSize === "2t" ? "100mm" : "50mm",
                minHeight: "150mm",
              }}
            >
              {allLabels.map((item: any) => (
                <div
                  key={item.uniqueKey}
                  className="flex flex-col items-center p-2 border shadow border-muted-foreground/30 bg-background"
                  style={{ pageBreakInside: "avoid" }}
                >
                  <p className="text-[10px] font-normal uppercase w-full text-center text-foreground line-clamp-2 break-words">
                    {item.productName}
                  </p>
                  <div className="my-1">
                    <Barcode
                      value={item.productId}
                      width={1.1} // Tăng nhẹ độ rộng của nét vạch (mặc định là 2, bạn đang để 1.0 là hơi mỏng)
                      height={40}
                      displayValue={false}
                      margin={0}
                      renderer="canvas" // Chuyển sang canvas để kiểm soát pixel tốt hơn
                      background="#ffffff" // Đảm bảo nền trắng tuyệt đối
                    />
                  </div>
                  <p className="text-[8px]  tracking-tighter uppercase">
                    {item.productId}
                  </p>
                  <p className="text-[12px] font-normal mt-1">
                    {(item.total / item.addQuantity).toLocaleString()} VND
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Sidebar điều khiển (Giống ảnh mẫu) */}
          <div className="min-w-[300px] border-l bg-background p-6 space-y-6 no-print">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Thiết lập in
              </h4>

              {/* Khổ giấy */}
              <div className="space-y-2">
                <Label>Khổ giấy</Label>
                <Select value={paperSize} onValueChange={setPaperSize}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2t">2 tem / hàng (2t)</SelectItem>
                    <SelectItem value="1t">1 tem / hàng (1t)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Thông tin bổ sung */}
              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Số trang dự kiến:
                  </span>
                  <span className="font-medium">
                    {Math.ceil(allLabels.length / 2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mật độ:</span>
                  <span className="font-medium">
                    {paperSize === "2t" ? "2 tem/trang ngang" : "1 tem/trang"}
                  </span>
                </div>
              </div>
            </div>
            <span className="text-sm text-muted-foreground mr-4">
              Tổng số tem: <strong>{allLabels.length}</strong>
            </span>
            <Button
              onClick={handlePrint}
              className="bg-primary text-primary-foreground shadow-sm"
            >
              <Printer className="w-4 h-4 mr-2" /> In ngay
            </Button>
            <div className="p-4 bg-muted/50 rounded-lg text-[11px] text-muted-foreground italic">
              * Mẹo: Kiểm tra kỹ cuộn giấy nhiệt trước khi in số lượng lớn.
            </div>
          </div>
        </div>

        {/* Print Styles */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @media print {
            @page { 
              margin: 0; 
              size: ${paperSize === "2t" ? "74mm auto" : "37mm auto"}; 
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #fff;
            }
            body * { visibility: hidden; }
            #barcode-print-area, #barcode-print-area * { 
              visibility: visible; 
            }
            #barcode-print-area canvas, 
            #barcode-print-area svg {
              
              image-rendering: pixelated;
              image-rendering: crisp-edges;
            }
            #barcode-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: ${paperSize === "2t" ? "74mm" : "37mm"} !important;
              display: grid !important;
              grid-template-columns: ${
                paperSize === "2t" ? "1fr 1fr" : "1fr"
              } !important;
              gap: 0 !important;
              border: none !important;
            }
            #barcode-print-area > div {
              border: none !important; /* Khi in thật không in viền */
              page-break-inside: avoid;
            }
            .no-print { display: none !important; }
          }
        `,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
