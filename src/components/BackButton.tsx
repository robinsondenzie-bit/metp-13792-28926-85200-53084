import { ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const BackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on home page
  if (location.pathname === "/") return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => navigate("/")}
      className="fixed top-4 left-4 z-[100] bg-background/80 backdrop-blur-sm hover:bg-background shadow-md"
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      Back
    </Button>
  );
};
