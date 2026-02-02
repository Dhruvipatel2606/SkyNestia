import React from "react";
import Conversation from "../../Conversation";

export default function ChatList({ chats, setCurrentChat, onlineUsers, currentUser }) {

    const checkOnlineStatus = (chat) => {
        const chatMember = chat.members.find((member) => member !== currentUser._id);
        const online = onlineUsers.find((u) => u.userId === chatMember);
        return online ? true : false;
    };

    return (
        <div className="chatList">
            <h3>Chats</h3>
            <div className="chatList-container">
                {chats.map((chat) => (
                    <div onClick={() => setCurrentChat(chat)} key={chat._id}>
                        <Conversation
                            data={chat}
                            currentUserId={currentUser._id}
                            online={checkOnlineStatus(chat)}
                        />
                    </div>
                ))}
                {chats.length === 0 && <span style={{ padding: '20px', color: 'var(--text-muted)' }}>No chats yet.</span>}
            </div>
        </div>
    );
}
