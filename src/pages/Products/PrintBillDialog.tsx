import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Receipt, AlertTriangle, HelpCircle, Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import type { Bill } from "@/types";

interface PrintBillDialogProps {
  bill: Bill;
}

export function PrintBillDialog({ bill }: PrintBillDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: bill?.name || `HoaDon_${bill?.id}`,
  });

  // Khắc phục lỗi: Dự phòng mảng rỗng nếu billProducts bị undefined
  const products = bill.billProducts ?? [];

  // Tính tổng tiền trước giảm giá dựa trên mảng an toàn
  const subTotal = products.reduce((acc, item) => acc + item.total, 0);

  // Định dạng hiển thị ngày tháng an toàn (Xử lý cả Date object lẫn String)
  const formatDate = (dateInput: Date | string | undefined) => {
    if (!dateInput) return "";
    try {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return String(dateInput);
      return `${String(d.getDate()).padStart(2, "0")}/${String(
        d.getMonth() + 1
      ).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(
        2,
        "0"
      )}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch {
      return String(dateInput);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-primary text-primary hover:bg-primary/10"
        >
          <Receipt className="w-4 h-4" /> In hóa đơn
        </Button>
      </DialogTrigger>

      <DialogContent className="min-w-[95vw] max-w-[98vw] h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between bg-muted/30">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" /> Xem trước hóa đơn bán hàng
          </DialogTitle>
        </DialogHeader>

        {/* Khung chính */}
        <div className="flex flex-1 overflow-hidden">
          {/* GIỮA: Khu vực Preview mô phỏng khổ giấy cuộn K80 */}
          <div className="flex-1 bg-secondary/20 p-6 overflow-y-auto flex justify-center custom-scrollbar">
            <div className="bill-paper-shadow h-fit bg-background">
              <div
                ref={contentRef}
                className="bill-print-container"
                id="bill-print-area"
              >
                {/* Tên cửa hàng / Logo mẫu */}
                <div className="text-center space-y-1 mb-4">
                  <h3 className="text-base font-black tracking-tight uppercase text-foreground">
                    CỬA HÀNG THỜI TRANG
                  </h3>
                  <p className="text-[11px] text-foreground/80 leading-tight">
                    Đ/c: Số 90 Quang Trung, TP. Bắc Giang
                  </p>
                  <p className="text-[11px] text-foreground/80">
                    Điện thoại: 0240.3858.114
                  </p>
                </div>

                <hr className="border-t border-dashed border-foreground/30 my-3" />

                {/* Tiêu đề hóa đơn */}
                <div className="text-center space-y-1 mb-4">
                  <h4 className="text-sm font-bold uppercase text-foreground tracking-wide">
                    HÓA ĐƠN BÁN HÀNG
                  </h4>
                  <p className="text-[10px] font-mono text-foreground/70">
                    Số HD: {bill.id}
                  </p>
                  <p className="text-[10px] text-foreground/70 italic">
                    Ngày: {formatDate(bill.createdAt)}
                  </p>
                </div>

                {/* Thông tin khách hàng */}
                <div className="text-[11px] space-y-1 mb-4 text-foreground text-left">
                  <div className="flex">
                    <span className="w-20 shrink-0">Khách hàng:</span>
                    <span className="font-medium">{bill.customerName ?? "Khách lẻ"}</span>
                  </div>
                  {bill.phoneNumber && (
                    <div className="flex">
                      <span className="w-20 shrink-0">SĐT:</span>
                      <span className="font-mono">{bill.phoneNumber}</span>
                    </div>
                  )}
                </div>

                {/* Danh sách sản phẩm */}
                <div className="w-full text-[11px] text-foreground">
                  <div className="flex font-bold border-b border-foreground/40 pb-1 uppercase text-[10px]">
                    <div className="flex-1 text-left">Đơn giá</div>
                    <div className="w-10 text-center">SL</div>
                    <div className="w-24 text-right">Thành tiền</div>
                  </div>

                  <div className="divide-y divide-dashed divide-foreground/20">
                    {products.map((product, index) => (
                      <div key={product.id || index} className="py-2 space-y-0.5">
                        <div className="font-medium text-left leading-tight text-[11px]">
                          {product.productName}
                        </div>
                        <div className="flex text-foreground/90 font-mono text-[10.5px]">
                          <div className="flex-1 text-left">
                            {product.salePrice.toLocaleString()}
                          </div>
                          <div className="w-10 text-center">{product.quantity}</div>
                          <div className="w-24 text-right font-bold text-foreground">
                            {product.total.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <hr className="border-t border-foreground/40 my-3" />

                {/* Khối tính tiền tổng */}
                <div className="text-[11px] space-y-1.5 text-foreground">
                  <div className="flex justify-between">
                    <span>Tổng tiền hàng:</span>
                    <span className="font-mono">{subTotal.toLocaleString()}</span>
                  </div>
                  {bill.discount > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Giảm giá:</span>
                      <span className="font-mono">-{bill.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-bold pt-1 border-t border-foreground/20">
                    <span className="uppercase">Tổng thanh toán:</span>
                    <span className="font-mono text-sm">
                      {bill.total.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Khách thanh toán:</span>
                    <span className="font-mono">{bill.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tiền thừa:</span>
                    <span className="font-mono">0</span>
                  </div>
                </div>

                <hr className="border-t border-dashed border-foreground/30 my-4" />

                {/* Lời chào chân trang */}
                <div className="text-center text-[10.5px] italic text-foreground/80 space-y-1">
                  <p>Cảm ơn và hẹn gặp lại!</p>
                  <p className="text-[9px] font-mono not-italic text-foreground/40">
                    Powered by KiotViet Style
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: Cài đặt và cấu hình */}
          <div className="w-[320px] border-l bg-background p-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-widest">
                  Cài đặt máy in mục tiêu
                </h4>
                
                <div className="space-y-4 rounded-xl border p-4 bg-muted/10">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Khổ giấy khuyên dùng</label>
                    <div className="text-sm font-semibold p-2 bg-background border rounded-lg text-accent-foreground flex justify-between items-center">
                      <span>Khổ K80 (80mm x 297mm)</span>
                      <HelpCircle className="w-4 h-4 text-muted-foreground/60" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Tỷ lệ bản in</label>
                    <div className="text-sm font-medium p-2 bg-background border rounded-lg text-muted-foreground">
                      Mặc định (100%)
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Căn lề (Margins)</label>
                    <div className="text-sm font-medium p-2 bg-background border rounded-lg text-muted-foreground">
                      Tối thiểu (Minimum / None)
                    </div>
                  </div>
                </div>
              </div>

              {/* Box Lưu ý hệ thống */}
              <div className="p-4 bg-destructive/5 rounded-xl border border-destructive/20 space-y-3">
                <div className="flex items-center gap-2 text-destructive font-bold text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span>CẤU HÌNH TRÌNH DUYỆT:</span>
                </div>
                <ul className="text-[11.5px] text-muted-foreground list-disc pl-4 space-y-1.5 leading-relaxed">
                  <li>Tắt tùy chọn <b>Headers and footers</b> (Đầu trang và chân trang) khi hộp thoại in hiện lên.</li>
                  <li>Chọn đúng máy in hóa đơn nhiệt chuyên dụng của bạn.</li>
                </ul>
              </div>
            </div>

            {/* Nút In */}
            <div className="flex gap-3">
              <Button
                onClick={() => handlePrint()}
                size="lg"
                className="w-full bg-primary hover:bg-primary/90 gap-2 shadow-lg active:scale-95 transition-all text-sm font-semibold"
              >
                <Printer className="w-4 h-4" /> In hóa đơn
              </Button>
            </div>
          </div>
        </div>

        {/* CSS Scoped tùy biến giao diện in */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
            .bill-paper-shadow {
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
              border: 1px solid hsl(var(--border));
              border-radius: 4px;
            }

            .bill-print-container {
              width: 76mm;
              padding: 4mm 4mm 6mm 4mm;
              background: white;
              font-family: 'Inter', system-ui, sans-serif;
              box-sizing: border-box;
            }

            @media print {
              @page {
                size: 80mm auto;
                margin: 0mm !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .bill-paper-shadow {
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
              }
              .bill-print-container {
                width: 80mm !important;
                padding: 4mm 6mm !important;
                margin: 0 !important;
              }
              .bill-print-container * {
                color: #000000 !important;
              }
            }
            
            .custom-scrollbar::-webkit-scrollbar { width: 5px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { 
                background-color: hsl(var(--muted-foreground) / 0.25); 
                border-radius: 10px; 
            }
            `,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}