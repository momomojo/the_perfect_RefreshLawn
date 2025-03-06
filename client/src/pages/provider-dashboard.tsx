import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Service, Appointment, WeeklySchedule, BlockedDate } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceSchema, insertWeeklyScheduleSchema, insertBlockedDateSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckIcon, XIcon, ClockIcon, LogOutIcon, CalendarIcon, AlarmClock, Calendar as CalendarIcon2, Clock, X } from "lucide-react";
import { useLocation } from "wouter";
import * as z from 'zod';
import { format } from "date-fns";
import { useState, useEffect } from "react";
import React from 'react';

export default function ProviderDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/services/provider"],
  });

  const { data: appointments } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments/provider"],
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/appointments/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/provider"] });
      toast({
        title: "Success",
        description: "Appointment status updated",
      });
    },
  });

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    setLocation("/auth");
  };

  return (
    <div className="min-h-screen bg-[#F5F7F3] p-8">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Welcome, {user?.name}</h1>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOutIcon className="h-4 w-4" />
            Logout
          </Button>
        </div>

        <Tabs defaultValue="appointments">
          <TabsList className="mb-8">
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
          </TabsList>

          <TabsContent value="appointments">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {appointments?.map((appointment) => (
                <Card key={appointment.id}>
                  <CardHeader>
                    <CardTitle>
                      Appointment #{appointment.id}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4">
                      {new Date(appointment.startTime).toLocaleString()}
                    </p>
                    <p className="mb-4">
                      Status: {appointment.status}
                    </p>
                    <div className="flex gap-2">
                      {appointment.status === "pending" && (
                        <>
                          <Button
                            onClick={() =>
                              updateAppointmentMutation.mutate({
                                id: appointment.id,
                                status: "accepted",
                              })
                            }
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <CheckIcon className="h-4 w-4" />
                            Accept
                          </Button>
                          <Button
                            onClick={() =>
                              updateAppointmentMutation.mutate({
                                id: appointment.id,
                                status: "declined",
                              })
                            }
                            variant="destructive"
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <XIcon className="h-4 w-4" />
                            Decline
                          </Button>
                        </>
                      )}
                      {appointment.status === "accepted" && (
                        <Button
                          onClick={() =>
                            updateAppointmentMutation.mutate({
                              id: appointment.id,
                              status: "completed",
                            })
                          }
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <CheckIcon className="h-4 w-4" />
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="services">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-2xl font-bold mb-6">Your Services</h2>
                <div className="grid gap-6">
                  {services?.map((service) => (
                    <Card key={service.id}>
                      <CardContent className="pt-6">
                        <img
                          src={service.imageUrl}
                          alt={service.title}
                          className="rounded-lg mb-4 w-full aspect-video object-cover"
                        />
                        <h3 className="text-xl font-bold mb-2">{service.title}</h3>
                        <p className="text-muted-foreground mb-2">
                          {service.description}
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <ClockIcon className="h-4 w-4" />
                            <span>{service.duration} mins</span>
                          </div>
                          <div className="font-bold">
                            ${service.price.toString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-6">Add New Service</h2>
                <CreateServiceForm />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="availability">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-2xl font-bold mb-6">Weekly Schedule</h2>
                <WeeklyScheduleManager />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-6">Blocked Dates</h2>
                <BlockedDatesManager />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CreateServiceForm() {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(
      insertServiceSchema.extend({
        imageFile: z.instanceof(File).optional(),
      })
    ),
    defaultValues: {
      title: "",
      description: "",
      duration: 60, // Default duration in minutes
      price: "0", // Changed to string type to match the schema expectation
      imageUrl: "",
      imageFile: undefined
    }
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to upload image');
      return res.json();
    }
  });

  const createServiceMutation = useMutation({
    mutationFn: async (data: any) => {
      let imageUrl = "";

      if (data.imageFile) {
        const uploadResult = await uploadImageMutation.mutateAsync(data.imageFile);
        imageUrl = uploadResult.url;
      } else {
        throw new Error('Please upload an image for your service');
      }

      // Ensure numeric fields are properly formatted
      const serviceData = {
        title: data.title,
        description: data.description,
        duration: Number(data.duration), 
        price: data.price, // Keep as string as that's what the schema expects
        imageUrl,
      };

      const res = await apiRequest("POST", "/api/services", serviceData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services/provider"] });
      form.reset();
      toast({
        title: "Success",
        description: "Service created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to create service: " + error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => createServiceMutation.mutate(data))}
        className="space-y-6"
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (minutes)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  {...field} 
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price ($)</FormLabel>
              <FormControl>
                <Input 
                  type="text"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageFile"
          render={({ field: { value, onChange, ...field } }) => (
            <FormItem>
              <FormLabel>Image</FormLabel>
              <FormControl>
                <Input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onChange(file);
                  }}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={createServiceMutation.isPending}
        >
          Create Service
        </Button>
      </form>
    </Form>
  );
}

function WeeklyScheduleManager() {
  const { toast } = useToast();
  const daysOfWeek = [
    { label: "Sunday", value: "0" },
    { label: "Monday", value: "1" },
    { label: "Tuesday", value: "2" },
    { label: "Wednesday", value: "3" },
    { label: "Thursday", value: "4" },
    { label: "Friday", value: "5" },
    { label: "Saturday", value: "6" },
  ];

  const { data: weeklySchedules, isLoading } = useQuery<WeeklySchedule[]>({
    queryKey: ["/api/weekly-schedules"],
  });

  const form = useForm({
    resolver: zodResolver(insertWeeklyScheduleSchema),
    defaultValues: {
      dayOfWeek: 1, // Monday
      startTime: "09:00",
      endTime: "17:00",
      isAvailable: true
    }
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/weekly-schedules", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-schedules"] });
      form.reset({
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00",
        isAvailable: true
      });
      toast({
        title: "Success",
        description: "Weekly schedule created successfully",
      });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/weekly-schedules/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-schedules"] });
      toast({
        title: "Success",
        description: "Schedule updated successfully",
      });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/weekly-schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-schedules"] });
      toast({
        title: "Success",
        description: "Schedule deleted successfully",
      });
    },
  });

  // Group schedules by day of week for better display
  const groupedSchedules = React.useMemo(() => {
    if (!weeklySchedules) return {};

    return weeklySchedules.reduce((acc: Record<number, WeeklySchedule[]>, schedule) => {
      if (!acc[schedule.dayOfWeek]) {
        acc[schedule.dayOfWeek] = [];
      }
      acc[schedule.dayOfWeek].push(schedule);
      return acc;
    }, {});
  }, [weeklySchedules]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 p-4 rounded-lg border">
        <h3 className="text-lg font-medium mb-3">Add Time Window</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Add multiple time windows for each day to give your customers more booking options.
        </p>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => createScheduleMutation.mutate(data))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="dayOfWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Day of Week</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {daysOfWeek.map((day) => (
                        <SelectItem key={day.value} value={day.value}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isAvailable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Available</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={createScheduleMutation.isPending}
            >
              Add Time Window
            </Button>
          </form>
        </Form>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-3">Your Weekly Schedule</h3>
        {isLoading ? (
          <p>Loading schedules...</p>
        ) : weeklySchedules && weeklySchedules.length > 0 ? (
          <div className="space-y-6">
            {daysOfWeek.map((day) => {
              const daySchedules = groupedSchedules[parseInt(day.value)] || [];
              if (daySchedules.length === 0) return null;

              return (
                <div key={day.value} className="space-y-2">
                  <h4 className="font-medium">{day.label}</h4>
                  <div className="space-y-2">
                    {daySchedules.map((schedule) => (
                      <Card key={schedule.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                {schedule.startTime} - {schedule.endTime}
                              </p>
                              <p className="text-sm">
                                {schedule.isAvailable ? "Available" : "Unavailable"}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  updateScheduleMutation.mutate({
                                    id: schedule.id,
                                    data: { isAvailable: !schedule.isAvailable }
                                  });
                                }}
                              >
                                {schedule.isAvailable ? "Mark Unavailable" : "Mark Available"}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p>No schedules set up yet.</p>
        )}
      </div>
    </div>
  );
}

function BlockedDatesManager() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const { data: blockedDates, isLoading } = useQuery<BlockedDate[]>({
    queryKey: ["/api/blocked-dates"],
  });

  const extendedBlockedDateSchema = insertBlockedDateSchema.extend({
    date: z.date(),
  });

  const form = useForm({
    resolver: zodResolver(extendedBlockedDateSchema),
    defaultValues: {
      date: undefined,
      isFullDay: true,
      startTime: "09:00",
      endTime: "17:00",
      reason: ""
    }
  });

  const createBlockedDateMutation = useMutation({
    mutationFn: async (data: any) => {
      // Format date as ISO string for backend
      const formattedData = {
        ...data,
        date: data.date.toISOString().split('T')[0],
      };
      const res = await apiRequest("POST", "/api/blocked-dates", formattedData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blocked-dates"] });
      form.reset({
        isFullDay: true,
        startTime: "09:00",
        endTime: "17:00",
      });
      setSelectedDate(undefined);
      toast({
        title: "Success",
        description: "Blocked date added successfully",
      });
    },
  });

  const deleteBlockedDateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/blocked-dates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blocked-dates"] });
      toast({
        title: "Success",
        description: "Blocked date removed successfully",
      });
    },
  });

  // Monitor changes on the selectedDate
  useEffect(() => {
    if (selectedDate) {
      form.setValue("date", selectedDate);
    }
  }, [selectedDate, form]);

  const isFullDay = form.watch("isFullDay");

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) => createBlockedDateMutation.mutate(data))}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Select Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={!field.value ? "text-muted-foreground" : ""}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon2 className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason (Optional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Vacation, Holiday, etc." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isFullDay"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Full Day</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {!isFullDay && (
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={createBlockedDateMutation.isPending || !form.getValues("date")}
          >
            Block Date
          </Button>
        </form>
      </Form>

      <div>
        <h3 className="text-lg font-medium mb-3">Your Blocked Dates</h3>
        {isLoading ? (
          <p>Loading blocked dates...</p>
        ) : blockedDates && blockedDates.length > 0 ? (
          <div className="space-y-4">
            {blockedDates.map((blockedDate) => (
              <Card key={blockedDate.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {new Date(blockedDate.date).toLocaleDateString()}
                      </p>
                      {!blockedDate.isFullDay && (
                        <p className="text-sm text-muted-foreground">
                          {blockedDate.startTime} - {blockedDate.endTime}
                        </p>
                      )}
                      {blockedDate.reason && (
                        <p className="text-sm text-muted-foreground">{blockedDate.reason}</p>
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteBlockedDateMutation.mutate(blockedDate.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p>No blocked dates set up yet.</p>
        )}
      </div>
    </div>
  );
}