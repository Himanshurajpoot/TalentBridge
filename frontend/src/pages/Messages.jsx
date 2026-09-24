import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import {
    connectSocket,
    getSocket,
} from "../services/socket";

export default function Messages() {
    const { user } = useAuth();
    const location = useLocation();

    const requestedConversationId =
        location.state?.conversationId;

    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] =
        useState(null);
    const [messages, setMessages] = useState([]);
    const [content, setContent] = useState("");

    const [connected, setConnected] = useState(() =>
        Boolean(getSocket()?.connected)
    );

    const [loadingConversations, setLoadingConversations] =
        useState(true);

    const [loadingMessages, setLoadingMessages] =
        useState(false);

    const [error, setError] = useState("");

    const messagesEndRef = useRef(null);
    const selectedConversationRef = useRef(null);

    useEffect(() => {
        selectedConversationRef.current =
            selectedConversation;
    }, [selectedConversation]);

    const markMessageAsRead = useCallback(
        (messageId) => {
            const socket = getSocket();

            if (!socket?.connected || !messageId) {
                return;
            }

            socket.emit(
                "markAsRead",
                messageId,
                (response) => {
                    if (!response?.success) {
                        console.error(
                            "Failed to mark message as read:",
                            response?.message
                        );
                        return;
                    }

                    setMessages((current) =>
                        current.map((message) =>
                            Number(message.id) ===
                            Number(messageId)
                                ? {
                                      ...message,
                                      is_read: true,
                                  }
                                : message
                        )
                    );
                }
            );
        },
        []
    );

    const markUnreadMessagesAsRead = useCallback(
        (messageList) => {
            const currentUserId = Number(user?.id);

            messageList.forEach((message) => {
                const isIncomingMessage =
                    Number(message.sender_id) !==
                    currentUserId;

                if (
                    isIncomingMessage &&
                    !message.is_read
                ) {
                    markMessageAsRead(message.id);
                }
            });
        },
        [user?.id, markMessageAsRead]
    );

    const loadConversations = useCallback(
        (socket) => {
            if (!socket?.connected) {
                return;
            }

            setLoadingConversations(true);

            socket.emit(
                "getMyConversations",
                (response) => {
                    if (!response?.success) {
                        setError(
                            response?.message ||
                                "Unable to load conversations."
                        );

                        setLoadingConversations(false);
                        return;
                    }

                    const loadedConversations =
                        response.conversations || [];

                    setConversations(
                        loadedConversations
                    );

                    setLoadingConversations(false);

                    if (
                        loadedConversations.length ===
                        0
                    ) {
                        setSelectedConversation(null);
                        setMessages([]);
                        setLoadingMessages(false);
                        return;
                    }

                    if (requestedConversationId) {
                        const requestedConversation =
                            loadedConversations.find(
                                (conversation) =>
                                    Number(
                                        conversation.id
                                    ) ===
                                    Number(
                                        requestedConversationId
                                    )
                            );

                        if (requestedConversation) {
                            setLoadingMessages(true);
                            setError("");

                            setSelectedConversation(
                                requestedConversation
                            );

                            return;
                        }
                    }

                    setSelectedConversation(
                        (current) => {
                            if (current) {
                                const existing =
                                    loadedConversations.find(
                                        (conversation) =>
                                            Number(
                                                conversation.id
                                            ) ===
                                            Number(
                                                current.id
                                            )
                                    );

                                if (existing) {
                                    setLoadingMessages(
                                        true
                                    );
                                    setError("");

                                    return existing;
                                }
                            }

                            setLoadingMessages(true);
                            setError("");

                            return loadedConversations[0];
                        }
                    );
                }
            );
        },
        [requestedConversationId]
    );

    useEffect(() => {
        let socket = getSocket();

        if (!socket) {
            socket = connectSocket();
        }

        if (!socket) {
            return undefined;
        }

        const handleConnect = () => {
            setConnected(true);
            setError("");
            loadConversations(socket);
        };

        const handleDisconnect = () => {
            setConnected(false);
        };

        const handleNewMessage = (message) => {
            const conversationId = Number(
                message.conversation_id
            );

            setConversations((current) => {
                const exists = current.some(
                    (conversation) =>
                        Number(conversation.id) ===
                        conversationId
                );

                if (!exists) {
                    return current;
                }

                return current
                    .map((conversation) => {
                        if (
                            Number(conversation.id) !==
                            conversationId
                        ) {
                            return conversation;
                        }

                        return {
                            ...conversation,
                            updated_at:
                                message.created_at,
                            last_message: {
                                id: message.id,
                                sender_id:
                                    message.sender_id,
                                content:
                                    message.content,
                                created_at:
                                    message.created_at,
                            },
                        };
                    })
                    .sort(
                        (a, b) =>
                            new Date(b.updated_at) -
                            new Date(a.updated_at)
                    );
            });

            const currentConversation =
                selectedConversationRef.current;

            if (
                Number(currentConversation?.id) !==
                conversationId
            ) {
                return;
            }

            setMessages((current) => {
                if (
                    current.some(
                        (item) =>
                            Number(item.id) ===
                            Number(message.id)
                    )
                ) {
                    return current;
                }

                return [...current, message];
            });

            if (
                Number(message.sender_id) !==
                Number(user?.id)
            ) {
                markMessageAsRead(message.id);
            }
        };

        const handleMessageRead = ({
            messageId,
            readBy,
        }) => {
            setMessages((current) =>
                current.map((message) =>
                    Number(message.id) ===
                    Number(messageId)
                        ? {
                              ...message,
                              is_read: true,
                              read_by: readBy,
                          }
                        : message
                )
            );
        };

        socket.on("connect", handleConnect);

        socket.on(
            "disconnect",
            handleDisconnect
        );

        socket.on(
            "newMessage",
            handleNewMessage
        );

        socket.on(
            "messageRead",
            handleMessageRead
        );

        if (socket.connected) {
            queueMicrotask(() => {
                loadConversations(socket);
            });
        }

        return () => {
            socket.off(
                "connect",
                handleConnect
            );

            socket.off(
                "disconnect",
                handleDisconnect
            );

            socket.off(
                "newMessage",
                handleNewMessage
            );

            socket.off(
                "messageRead",
                handleMessageRead
            );
        };
    }, [
        user?.id,
        loadConversations,
        markMessageAsRead,
    ]);

    const selectedConversationId =
        selectedConversation?.id;

    useEffect(() => {
        if (!selectedConversationId) {
            return;
        }

        const socket = getSocket();

        if (!socket?.connected) {
            return;
        }

        socket.emit(
            "joinConversation",
            selectedConversationId,
            (joinResponse) => {
                if (!joinResponse?.success) {
                    setError(
                        joinResponse?.message ||
                            "Unable to join conversation."
                    );

                    setLoadingMessages(false);
                    return;
                }

                socket.emit(
                    "getConversationMessages",
                    selectedConversationId,
                    (messageResponse) => {
                        if (
                            !messageResponse?.success
                        ) {
                            setError(
                                messageResponse?.message ||
                                    "Unable to load messages."
                            );

                            setLoadingMessages(false);
                            return;
                        }

                        const loadedMessages =
                            messageResponse.messages ||
                            [];

                        setMessages(
                            loadedMessages
                        );

                        setLoadingMessages(false);
                        setError("");

                        markUnreadMessagesAsRead(
                            loadedMessages
                        );
                    }
                );
            }
        );
    }, [
        selectedConversationId,
        markUnreadMessagesAsRead,
    ]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
        });
    }, [messages]);

    const handleSelectConversation = (
        conversation
    ) => {
        setSelectedConversation(conversation);
        setMessages([]);
        setContent("");
        setError("");
        setLoadingMessages(true);
    };

    const handleSendMessage = (event) => {
        event.preventDefault();

        const trimmedContent = content.trim();

        if (!trimmedContent) {
            return;
        }

        if (!selectedConversation) {
            return;
        }

        const socket = getSocket();

        if (!socket?.connected) {
            setError(
                "Messaging service is not connected."
            );
            return;
        }

        socket.emit(
            "sendMessage",
            {
                conversationId:
                    selectedConversation.id,
                content: trimmedContent,
            },
            (response) => {
                if (!response?.success) {
                    setError(
                        response?.message ||
                            "Failed to send message."
                    );
                    return;
                }

                const sentMessage =
                    response.message;

                if (sentMessage) {
                    setMessages((current) => {
                        if (
                            current.some(
                                (item) =>
                                    Number(
                                        item.id
                                    ) ===
                                    Number(
                                        sentMessage.id
                                    )
                            )
                        ) {
                            return current;
                        }

                        return [
                            ...current,
                            sentMessage,
                        ];
                    });

                    setConversations((current) =>
                        current
                            .map((conversation) => {
                                if (
                                    Number(
                                        conversation.id
                                    ) !==
                                    Number(
                                        selectedConversation.id
                                    )
                                ) {
                                    return conversation;
                                }

                                return {
                                    ...conversation,
                                    updated_at:
                                        sentMessage.created_at,
                                    last_message: {
                                        id: sentMessage.id,
                                        sender_id:
                                            sentMessage.sender_id,
                                        content:
                                            sentMessage.content,
                                        created_at:
                                            sentMessage.created_at,
                                    },
                                };
                            })
                            .sort(
                                (a, b) =>
                                    new Date(
                                        b.updated_at
                                    ) -
                                    new Date(
                                        a.updated_at
                                    )
                            )
                    );
                }

                setContent("");
                setError("");
            }
        );
    };

    const getConversationName = (
        conversation
    ) => {
        if (
            !conversation?.participants ||
            conversation.participants.length === 0
        ) {
            return "Conversation";
        }

        return conversation.participants
            .map(
                (participant) =>
                    participant.full_name
            )
            .join(", ");
    };

    const getConversationPreview = (
        conversation
    ) => {
        if (!conversation?.last_message) {
            return "No messages yet";
        }

        return conversation.last_message.content;
    };

    return (
        <main className="h-[calc(100vh-73px)] overflow-hidden">
            <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden px-6 py-6">
                <div className="mb-6 shrink-0">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Messages
                    </h1>

                    <p className="mt-2 text-gray-600">
                        Connect and communicate in real
                        time
                    </p>
                </div>

                <div className="grid min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:grid-cols-[320px_1fr]">
                    <aside className="flex min-h-0 flex-col border-b border-gray-200 md:border-b-0 md:border-r">
                        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4">
                            <div>
                                <h2 className="font-semibold text-gray-900">
                                    Conversations
                                </h2>

                                <p className="mt-1 text-xs text-gray-500">
                                    {conversations.length}{" "}
                                    {conversations.length ===
                                    1
                                        ? "conversation"
                                        : "conversations"}
                                </p>
                            </div>

                            <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                    connected
                                        ? "bg-green-500"
                                        : "bg-red-500"
                                }`}
                            />
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto">
                            {loadingConversations ? (
                                <div className="px-5 py-8 text-center text-sm text-gray-500">
                                    Loading conversations...
                                </div>
                            ) : conversations.length ===
                              0 ? (
                                <div className="px-5 py-8 text-center">
                                    <p className="font-medium text-gray-700">
                                        No conversations
                                    </p>

                                    <p className="mt-1 text-sm text-gray-500">
                                        Your conversations will
                                        appear here.
                                    </p>
                                </div>
                            ) : (
                                conversations.map(
                                    (conversation) => {
                                        const isSelected =
                                            Number(
                                                selectedConversation?.id
                                            ) ===
                                            Number(
                                                conversation.id
                                            );

                                        return (
                                            <button
                                                key={
                                                    conversation.id
                                                }
                                                type="button"
                                                onClick={() =>
                                                    handleSelectConversation(
                                                        conversation
                                                    )
                                                }
                                                className={`w-full border-b border-gray-100 px-5 py-4 text-left transition ${
                                                    isSelected
                                                        ? "bg-blue-50"
                                                        : "hover:bg-gray-50"
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                                                        {getConversationName(
                                                            conversation
                                                        )
                                                            .charAt(
                                                                0
                                                            )
                                                            .toUpperCase()}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-semibold text-gray-900">
                                                            {getConversationName(
                                                                conversation
                                                            )}
                                                        </p>

                                                        <p className="mt-1 truncate text-xs text-gray-500">
                                                            {getConversationPreview(
                                                                conversation
                                                            )}
                                                        </p>

                                                        {conversation.last_message?.created_at && (
                                                            <p className="mt-1 text-[11px] text-gray-400">
                                                                {new Date(
                                                                    conversation.last_message.created_at
                                                                ).toLocaleString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    }
                                )
                            )}
                        </div>
                    </aside>

                    <section className="flex min-h-0 flex-col">
                        {!selectedConversation ? (
                            <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center">
                                <div>
                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-2xl">
                                        💬
                                    </div>

                                    <h2 className="mt-4 text-lg font-semibold text-gray-900">
                                        Select a conversation
                                    </h2>

                                    <p className="mt-2 text-sm text-gray-500">
                                        Choose a conversation from
                                        the list to start
                                        messaging.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4">
                                    <div>
                                        <h2 className="font-semibold text-gray-900">
                                            {getConversationName(
                                                selectedConversation
                                            )}
                                        </h2>

                                        <p className="mt-1 text-sm text-gray-500">
                                            Logged in as{" "}
                                            {user?.full_name ||
                                                "User"}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm">
                                        <span
                                            className={`h-2.5 w-2.5 rounded-full ${
                                                connected
                                                    ? "bg-green-500"
                                                    : "bg-red-500"
                                            }`}
                                        />

                                        <span className="text-gray-600">
                                            {connected
                                                ? "Connected"
                                                : "Disconnected"}
                                        </span>
                                    </div>
                                </div>

                                <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50 px-5 py-5">
                                    {loadingMessages ? (
                                        <div className="flex min-h-full items-center justify-center text-sm text-gray-500">
                                            Loading messages...
                                        </div>
                                    ) : messages.length ===
                                      0 ? (
                                        <div className="flex min-h-full items-center justify-center text-center text-gray-500">
                                            <div>
                                                <p className="font-medium">
                                                    No messages yet
                                                </p>

                                                <p className="mt-1 text-sm">
                                                    Send a message
                                                    to start the
                                                    conversation.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {messages.map(
                                                (
                                                    message
                                                ) => {
                                                    const isOwnMessage =
                                                        Number(
                                                            message.sender_id
                                                        ) ===
                                                        Number(
                                                            user?.id
                                                        );

                                                    return (
                                                        <div
                                                            key={
                                                                message.id
                                                            }
                                                            className={`flex ${
                                                                isOwnMessage
                                                                    ? "justify-end"
                                                                    : "justify-start"
                                                            }`}
                                                        >
                                                            <div
                                                                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                                                                    isOwnMessage
                                                                        ? "bg-blue-600 text-white"
                                                                        : "bg-white text-gray-900 shadow-sm"
                                                                }`}
                                                            >
                                                                {!isOwnMessage &&
                                                                    message.sender_name && (
                                                                        <p className="mb-1 text-xs font-semibold text-gray-500">
                                                                            {
                                                                                message.sender_name
                                                                            }
                                                                        </p>
                                                                    )}

                                                                <p className="break-words text-sm">
                                                                    {
                                                                        message.content
                                                                    }
                                                                </p>

                                                                <div
                                                                    className={`mt-1 flex items-center justify-between gap-3 text-xs ${
                                                                        isOwnMessage
                                                                            ? "text-blue-100"
                                                                            : "text-gray-400"
                                                                    }`}
                                                                >
                                                                    <span>
                                                                        {new Date(
                                                                            message.created_at
                                                                        ).toLocaleTimeString(
                                                                            [],
                                                                            {
                                                                                hour: "2-digit",
                                                                                minute: "2-digit",
                                                                            }
                                                                        )}
                                                                    </span>

                                                                    {isOwnMessage && (
                                                                        <span>
                                                                            {message.is_read
                                                                                ? "Read"
                                                                                : "Sent"}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            )}

                                            <div
                                                ref={
                                                    messagesEndRef
                                                }
                                            />
                                        </div>
                                    )}
                                </div>

                                {error && (
                                    <div className="shrink-0 border-t border-red-200 bg-red-50 px-5 py-3 text-sm text-red-600">
                                        {error}
                                    </div>
                                )}

                                <form
                                    onSubmit={
                                        handleSendMessage
                                    }
                                    className="flex shrink-0 gap-3 border-t border-gray-200 bg-white p-4"
                                >
                                    <input
                                        type="text"
                                        value={content}
                                        onChange={(
                                            event
                                        ) =>
                                            setContent(
                                                event.target
                                                    .value
                                            )
                                        }
                                        placeholder="Type a message..."
                                        className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    />

                                    <button
                                        type="submit"
                                        disabled={
                                            !connected ||
                                            !content.trim()
                                        }
                                        className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Send
                                    </button>
                                </form>
                            </>
                        )}
                    </section>
                </div>
            </div>
        </main>
    );
}