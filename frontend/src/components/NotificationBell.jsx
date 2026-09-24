import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { getSocket } from "../services/socket";

export default function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [open, setOpen] = useState(false);

    const navigate = useNavigate();

    const unreadCount = notifications.reduce(
        (count, notification) =>
            count + (notification.is_read ? 0 : 1),
        0
    );

    useEffect(() => {
        let mounted = true;

        const fetchNotifications = async () => {
            try {
                const response = await api.get("/notifications");

                if (!mounted) {
                    return;
                }

                const serverNotifications =
                    response.data?.data?.notifications || [];

                setNotifications(serverNotifications);
            } catch (error) {
                console.error(
                    "Failed to fetch notifications:",
                    error
                );
            }
        };

        fetchNotifications();

        const socket = getSocket();

        if (!socket) {
            return () => {
                mounted = false;
            };
        }

        const handleNewNotification = (notification) => {
            if (!mounted) {
                return;
            }

            setNotifications((current) => {
                const existingIndex = current.findIndex(
                    (item) => item.id === notification.id
                );

                if (existingIndex !== -1) {
                    return current.map((item) =>
                        item.id === notification.id
                            ? notification
                            : item
                    );
                }

                return [notification, ...current].slice(
                    0,
                    50
                );
            });
        };

        socket.on(
            "newNotification",
            handleNewNotification
        );

        return () => {
            mounted = false;

            socket.off(
                "newNotification",
                handleNewNotification
            );
        };
    }, []);

    const markAsRead = async (id) => {
        setNotifications((current) =>
            current.map((notification) =>
                notification.id === id
                    ? {
                          ...notification,
                          is_read: true,
                      }
                    : notification
            )
        );

        try {
            const response = await api.patch(
                `/notifications/${id}/read`
            );

            if (
                response.data?.success &&
                response.data?.data?.notification
            ) {
                const updatedNotification =
                    response.data.data.notification;

                setNotifications((current) =>
                    current.map((notification) =>
                        notification.id === id
                            ? updatedNotification
                            : notification
                    )
                );
            }
        } catch (error) {
            console.error(
                "Failed to mark notification as read:",
                error
            );

            const status = error.response?.status;

            if (status === 404) {
                setNotifications((current) =>
                    current.filter(
                        (notification) =>
                            notification.id !== id
                    )
                );
            }
        }
    };

    const markAllAsRead = async () => {
        const previousNotifications = notifications;

        setNotifications((current) =>
            current.map((notification) => ({
                ...notification,
                is_read: true,
            }))
        );

        try {
            const response = await api.patch(
                "/notifications/read-all"
            );

            if (!response.data?.success) {
                setNotifications(previousNotifications);
            }
        } catch (error) {
            console.error(
                "Failed to mark notifications as read:",
                error
            );

            setNotifications(previousNotifications);
        }
    };

    const handleNotificationClick = async (
        notification
    ) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }

        if (
            notification.reference_type ===
                "conversation" &&
            notification.reference_id
        ) {
            navigate("/messages", {
                state: {
                    conversationId:
                        Number(notification.reference_id),
                },
            });

            setOpen(false);
            return;
        }

        if (
            notification.reference_type === "project" &&
            notification.reference_id
        ) {
            if (
                notification.type ===
                "proposal_submitted"
            ) {
                navigate(
                    `/projects/${notification.reference_id}/proposals`
                );
            } else if (
                notification.type ===
                "proposal_accepted"
            ) {
                navigate(
                    `/projects/${notification.reference_id}`
                );
            }

            setOpen(false);
            return;
        }

        if (
            notification.reference_type === "job" &&
            notification.reference_id
        ) {
            if (
                notification.type ===
                "application_submitted"
            ) {
                navigate(
                    `/jobs/${notification.reference_id}/applications`
                );
            } else if (
                notification.type ===
                "application_status_updated"
            ) {
                navigate("/applications");
            }

            setOpen(false);
            return;
        }

        setOpen(false);
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() =>
                    setOpen((current) => !current)
                }
                className="relative rounded-lg p-2 text-slate-700 hover:bg-slate-100"
            >
                <span className="text-xl">🔔</span>

                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white">
                        {unreadCount > 99
                            ? "99+"
                            : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                        <h3 className="font-semibold text-slate-900">
                            Notifications
                        </h3>

                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={markAllAsRead}
                                className="text-xs font-medium text-blue-600 hover:text-blue-700"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-slate-500">
                                No notifications
                            </div>
                        ) : (
                            notifications.map(
                                (notification) => (
                                    <button
                                        key={
                                            notification.id
                                        }
                                        type="button"
                                        onClick={() =>
                                            handleNotificationClick(
                                                notification
                                            )
                                        }
                                        className={`block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 ${
                                            !notification.is_read
                                                ? "bg-blue-50"
                                                : "bg-white"
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className="mt-0.5">
                                                🔔
                                            </span>

                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {
                                                        notification.title
                                                    }
                                                </p>

                                                <p className="mt-1 text-sm text-slate-600">
                                                    {
                                                        notification.message
                                                    }
                                                </p>

                                                <p className="mt-1 text-xs text-slate-400">
                                                    {new Date(
                                                        notification.created_at
                                                    ).toLocaleString()}
                                                </p>
                                            </div>

                                            {!notification.is_read && (
                                                <span className="mt-2 h-2 w-2 rounded-full bg-blue-600" />
                                            )}
                                        </div>
                                    </button>
                                )
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}