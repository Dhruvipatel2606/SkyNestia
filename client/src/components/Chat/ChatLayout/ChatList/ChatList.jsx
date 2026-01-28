import { useEffect, useState } from "react";
import { getUserChats } from "../../../api/ChatRequests";
import Conversation from "../../Conversation";

export default function ChatList({ setCurrentChat }) {
    const user = JSON.parse(localStorage.getItem("profile"));
    const [chats, setChats] = useState([]);

    useEffect(() => {
        const fetchChats = async () => {
            const { data } = await getUserChats(user._id);
            setChats(data);
        };
        fetchChats();
    }, []);

    return (
        <div className="chatList">
            <h3>Personal</h3>

            {chats.map((chat) => (
                <div onClick={() => setCurrentChat(chat)} key={chat._id}>
                    <Conversation chat={chat} currentUser={user._id} />
                </div>
            ))}
        </div>
    );
}
