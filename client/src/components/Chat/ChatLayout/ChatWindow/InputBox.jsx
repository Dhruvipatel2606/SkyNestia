import { useState } from "react";
import { addMessage } from "../../../../api/MessageRequests";

export default function InputBox({ chat }) {
    const user = JSON.parse(localStorage.getItem("profile"));
    const [text, setText] = useState("");

    const handleSend = async () => {
        if (!text) return;

        await addMessage({
            chatId: chat._id,
            senderId: user._id,
            text
        });

        setText("");
    };

    return (
        <div className="inputBox">
            <input
                placeholder="Enter your message"
                value={text}
                onChange={(e) => setText(e.target.value)}
            />
            <button onClick={handleSend}>Send</button>
        </div>
    );
}
