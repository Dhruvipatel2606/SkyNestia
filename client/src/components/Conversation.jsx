export default function Conversation({ chat, currentUser }) {
    const friendId = chat.members.find((id) => id !== currentUser);

    return (
        <div className="conversation">
            <img src="/avatar.png" className="conversationImg" />
            <span>User {friendId}</span>
        </div>
    );
}
