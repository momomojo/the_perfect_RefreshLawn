import { useQuery, useMutation } from "@tanstack/react-query";
import { Service } from "@shared/schema";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { ClockIcon, DollarSignIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ServiceDetails() {
  const [location] = useLocation();
  const { toast } = useToast();
  const serviceId = parseInt(location.split("/").pop() || "0");

  const { data: service } = useQuery<Service>({
    queryKey: [`/api/services/${serviceId}`],
  });

  const bookAppointmentMutation = useMutation({
    mutationFn: async (date: Date) => {
      const res = await apiRequest("POST", "/api/appointments", {
        serviceId,
        startTime: date.toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/customer"] });
      toast({
        title: "Success",
        description: "Appointment booked successfully",
      });
      window.location.href = "/customer/dashboard";
    },
  });

  if (!service) {
    return (
      <div className="min-h-screen bg-[#F5F7F3] p-8">
        <div className="container mx-auto">
          <p>Service not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7F3] p-8">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <img
              src={service.imageUrl}
              alt={service.title}
              className="rounded-lg shadow-lg w-full aspect-video object-cover mb-6"
            />
            <h1 className="text-3xl font-bold mb-4">{service.title}</h1>
            <p className="text-muted-foreground mb-6">{service.description}</p>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="h-5 w-5 text-primary" />
                    <span>{service.duration} minutes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSignIcon className="h-5 w-5 text-primary" />
                    <span className="font-bold">${service.price.toString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">Select Appointment Date</h2>
                <Calendar
                  mode="single"
                  selected={undefined}
                  onSelect={(date) => {
                    if (date) {
                      bookAppointmentMutation.mutate(date);
                    }
                  }}
                  className="mb-4"
                />
                <p className="text-sm text-muted-foreground">
                  Click on a date to book your appointment
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
