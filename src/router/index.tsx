import { LandingPage } from "@/pages/Common/LandingPage";
import HomePage from "@/pages/Common/HomePage";
import { Navigate, Route, Routes } from "react-router-dom";
import ProductsList from "@/pages/Products/ProductsList";
import ReceivedNotesList from "@/pages/ReceivedNote/ReceivedNotesList";
import ProvidersList from "@/pages/Provider/ProvidersList";
import BillsList from "@/pages/Bill/BillsList";
import SalePOS from "@/pages/Sale/SalePOS";
import PublicRouters from "./PublicRouters";
import PrivateRoutes from "./PrivateRouters";
import BillStatistic from "@/pages/Bill/BillStatistic";

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRouters />}>
        <Route index element={<LandingPage />} />
      </Route>
      <Route element={<PrivateRoutes />}>
        <Route index element={<Navigate to="/home" replace={true} />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/products" element={<ProductsList />} />
        <Route path="/received-notes" element={<ReceivedNotesList />} />
        <Route path="/providers" element={<ProvidersList />} />
        <Route path="/sale" element={<SalePOS />} />
        <Route path="/bills" element={<BillsList />} />
        <Route path="/bills-statistic" element={<BillStatistic />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
