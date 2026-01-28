import { useEffect, useState } from "react";
import { getMessages } from "../../../api/MessageRequests";

export default function Messages({ chat }) {
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        const fetchMessages = async () => {
            const { data } = await getMessages(chat._id);
            setMessages(data);
        };
        fetchMessages();
    }, [chat]);

    return (
        <div className="messages">
            {messages.map((msg) => (
                <div className="message own" key={msg._id}>
                    {msg.text}
                </div>
            ))}
        </div>
    );
}
