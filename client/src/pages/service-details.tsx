import { useQuery, useMutation } from "@tanstack/react-query";
import { Service, WeeklySchedule, BlockedDate } from "@shared/schema";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ClockIcon, DollarSignIcon, MapPinIcon, FileTextIcon, CheckCircleIcon, ArrowLeftIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";

// Define booking schema with Zod for validation
const bookingSchema = z.object({
  address: z.string().min(5, "Address is required and must be at least 5 characters"),
  specialInstructions: z.string().optional(),
});

type BookingData = z.infer<typeof bookingSchema>;

export default function ServiceDetails() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth(); // Get user data to auto-populate address
  const serviceId = parseInt(location.split("/").pop() || "0");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [bookingStep, setBookingStep] = useState<"date" | "time" | "details" | "review">("date");

  const form = useForm<BookingData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      address: user?.address || "",
      specialInstructions: "",
    },
  });

  // Update address when user data loads
  useEffect(() => {
    if (user?.address) {
      form.setValue("address", user.address);
    }
  }, [user, form]);

  // Query for the service details
  const { data: service, isLoading: serviceLoading } = useQuery<Service>({
    queryKey: [`/api/services/${serviceId}`],
  });

  // Query for provider's weekly schedule to determine availability
  const { data: weeklySchedules } = useQuery<WeeklySchedule[]>({
    queryKey: [`/api/weekly-schedules/provider/${service?.providerId}`],
    enabled: !!service?.providerId,
  });

  // Query for provider's blocked dates
  const { data: blockedDates } = useQuery<BlockedDate[]>({
    queryKey: [`/api/blocked-dates/provider/${service?.providerId}`],
    enabled: !!service?.providerId,
  });

  // Generate available time slots when date is selected
  useEffect(() => {
    if (selectedDate && service) {
      generateTimeSlots(selectedDate, service);
    }
  }, [selectedDate, service, weeklySchedules, blockedDates]);

  // Function to generate available time slots based on provider availability
  const generateTimeSlots = (date: Date, service: Service) => {
    // Default business hours
    const defaultStart = "09:00";
    const defaultEnd = "17:00";

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = date.getDay();

    // Find schedule for the selected day
    const daySchedule = weeklySchedules?.find(
      schedule => schedule.dayOfWeek === dayOfWeek && schedule.isAvailable
    );

    // If no schedule found or day not available, no time slots
    if (!daySchedule) {
      setAvailableTimes([]);
      return;
    }

    // Check if date is blocked
    const dateStr = date.toISOString().split('T')[0];
    const isBlocked = blockedDates?.some(blocked => {
      const blockedDateStr = new Date(blocked.date).toISOString().split('T')[0];
      return blockedDateStr === dateStr && blocked.isFullDay;
    });

    if (isBlocked) {
      setAvailableTimes([]);
      return;
    }

    // Get start and end times from schedule or use defaults
    const startTime = daySchedule?.startTime || defaultStart;
    const endTime = daySchedule?.endTime || defaultEnd;

    // Create time slots every 30 minutes
    const slots: string[] = [];
    let current = startTime;

    while (current < endTime) {
      // Get service duration and ensure we don't go past end time
      const durationInMinutes = service.duration;
      const [hours, minutes] = current.split(':').map(Number);

      let endHour = hours;
      let endMinute = minutes + durationInMinutes;

      while (endMinute >= 60) {
        endHour += 1;
        endMinute -= 60;
      }

      const endTimeSlot = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

      if (endTimeSlot <= endTime) {
        slots.push(current);
      }

      // Increment by 30 minutes
      let nextHour = hours;
      let nextMinute = minutes + 30;

      if (nextMinute >= 60) {
        nextHour += 1;
        nextMinute -= 60;
      }

      current = `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`;
    }

    setAvailableTimes(slots);
  };

  // Format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Handle going back to the services list
  const handleBackToServices = () => {
    setLocation("/customer/dashboard");
  };

  // Book appointment mutation
  const bookAppointmentMutation = useMutation({
    mutationFn: async (bookingData: {
      serviceId: number;
      startTime: string;
      address: string;
      specialInstructions?: string;
    }) => {
      const res = await apiRequest("POST", "/api/appointments", bookingData);
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
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to book appointment: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Handle booking submission
  const handleBookSubmit = (formData: BookingData) => {
    if (!selectedDate || !selectedTime || !service) return;

    // Combine date and time
    const startTime = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    startTime.setHours(hours, minutes, 0, 0);

    // Create booking with string date format that matches the expected format on the server
    bookAppointmentMutation.mutate({
      serviceId,
      startTime: startTime.toISOString(), // Send as ISO string for the backend
      address: formData.address,
      specialInstructions: formData.specialInstructions
    });
  };

  // Go to previous booking step
  const handleBack = () => {
    if (bookingStep === "time") setBookingStep("date");
    else if (bookingStep === "details") setBookingStep("time");
    else if (bookingStep === "review") setBookingStep("details");
  };

  if (serviceLoading || !service) {
    return (
      <div className="min-h-screen bg-[#F5F7F3] p-8">
        <div className="container mx-auto">
          <p>Loading service details...</p>
        </div>
      </div>
    );
  }

  // Debug log to help diagnose available days issue
  console.log("Weekly Schedules:", weeklySchedules);

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
              <CardHeader>
                <CardTitle>Book This Service</CardTitle>
              </CardHeader>
              <CardContent>
                {bookingStep === "date" && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">1. Select Date</h2>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date);
                          setSelectedTime(undefined);
                          setBookingStep("time");
                        }
                      }}
                      disabled={(date) => {
                        // Disable past dates
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        // Check if date is in a blocked date
                        const dateStr = date.toISOString().split('T')[0];
                        const isBlocked = blockedDates?.some(blocked => {
                          const blockedDateStr = new Date(blocked.date).toISOString().split('T')[0];
                          return blockedDateStr === dateStr && blocked.isFullDay;
                        });

                        // Check day of week availability
                        const dayOfWeek = date.getDay();

                        // If no schedules at all are defined, consider all days available
                        if (!weeklySchedules || weeklySchedules.length === 0) {
                          return date < today || isBlocked;
                        }

                        // Find if there's an explicit schedule for this day of week
                        const daySchedules = weeklySchedules.filter(
                          schedule => schedule.dayOfWeek === dayOfWeek
                        );

                        // If no schedules for this day are defined, consider it available
                        if (daySchedules.length === 0) {
                          return date < today || isBlocked;
                        }

                        // If there are schedules for this day, check if at least one is available
                        const hasAvailableSchedule = daySchedules.some(
                          schedule => schedule.isAvailable
                        );

                        return date < today || isBlocked || !hasAvailableSchedule;
                      }}
                      className="mb-4"
                    />

                    {/* Back button to return to services */}
                    <div className="flex justify-between mt-4">
                      <Button
                        variant="outline"
                        onClick={handleBackToServices}
                        className="flex items-center gap-2"
                      >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Back to Services
                      </Button>

                      {selectedDate && (
                        <Button
                          onClick={() => setBookingStep("time")}
                        >
                          Continue
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {bookingStep === "time" && selectedDate && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">2. Select Time</h2>
                    <p className="mb-4">
                      Available times for {format(selectedDate, "EEEE, MMMM do")}:
                    </p>

                    {availableTimes.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                        {availableTimes.map((time) => (
                          <Button
                            key={time}
                            variant={selectedTime === time ? "default" : "outline"}
                            className="w-full"
                            onClick={() => setSelectedTime(time)}
                          >
                            {formatTime(time)}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-amber-500 mb-6">No available times for this date.</p>
                    )}

                    <div className="flex justify-between mt-4">
                      <Button variant="outline" onClick={handleBack}>
                        Back
                      </Button>
                      <Button
                        onClick={() => setBookingStep("details")}
                        disabled={!selectedTime}
                      >
                        Continue
                      </Button>
                    </div>
                  </div>
                )}

                {bookingStep === "details" && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">3. Service Details</h2>
                    <Form {...form}>
                      <form className="space-y-4">
                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Service Address</FormLabel>
                              <FormControl>
                                <Input placeholder="123 Main St, City, State, ZIP" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="specialInstructions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Special Instructions (Optional)</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter any special instructions or requirements..."
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-between mt-6">
                          <Button variant="outline" onClick={handleBack}>
                            Back
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              form.trigger();
                              if (form.formState.isValid) {
                                setBookingStep("review");
                              }
                            }}
                          >
                            Review Booking
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </div>
                )}

                {bookingStep === "review" && selectedDate && selectedTime && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">4. Review and Confirm</h2>

                    <div className="space-y-4 mb-6">
                      <div>
                        <h3 className="font-medium">Service</h3>
                        <p>{service.title}</p>
                      </div>

                      <div>
                        <h3 className="font-medium">Date & Time</h3>
                        <p>{format(selectedDate, "EEEE, MMMM do")} at {formatTime(selectedTime)}</p>
                      </div>

                      <div>
                        <h3 className="font-medium">Duration</h3>
                        <p>{service.duration} minutes</p>
                      </div>

                      <div>
                        <h3 className="font-medium">Price</h3>
                        <p>${service.price.toString()}</p>
                      </div>

                      <div>
                        <h3 className="font-medium">Address</h3>
                        <p>{form.getValues("address")}</p>
                      </div>

                      {form.getValues("specialInstructions") && (
                        <div>
                          <h3 className="font-medium">Special Instructions</h3>
                          <p>{form.getValues("specialInstructions")}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={handleBack}>
                        Back
                      </Button>
                      <Button
                        onClick={() => handleBookSubmit(form.getValues())}
                        disabled={bookAppointmentMutation.isPending}
                        className="flex items-center gap-2"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                        Confirm Booking
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}