import ChatList from "./ChatList/ChatList";
import ChatBox from "../ChatBox";

export default function ChatLayout({
    chats,
    setChats,
    currentChat,
    setCurrentChat,
    onlineUsers,
    currentUser,
    sendMessage,
    receiveMessage,
    setSendMessage
}) {
    return (
        <div className={`chatLayout ${currentChat ? 'chat-active' : ''}`}>
            <ChatList
                chats={chats}
                setChats={setChats}
                setCurrentChat={setCurrentChat}
                onlineUsers={onlineUsers}
                currentUser={currentUser}
            />
            <ChatBox
                chat={currentChat}
                currentUser={currentUser?._id}
                setSendMessage={setSendMessage}
                receiveMessage={receiveMessage}
                setChat={setCurrentChat} // Pass handler for back button
            />
        </div>
    );
}
