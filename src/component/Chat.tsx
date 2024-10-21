import { useEffect, useState } from "react";
import { useSocket } from "../Hooks/UseSocket";
import useKeycloakAuth from "../Hooks/UseKeycloakAuth";
import "./Chat.css";

interface Chats {
    name: string;
    message: string;
    email?: string;
}

const Chat = () => {
    const [openchat, setOpenchat] = useState<boolean>(false);
    const [mychats, setMychats] = useState<string>("");
    const [chats, setChats] = useState<Chats[]>([]);
    const socket = useSocket();
    const keycloak = useKeycloakAuth();

    const handleSend = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!mychats.trim()) return; // Prevent sending empty messages

        const chat = {
            name: keycloak.keycloak?.tokenParsed?.preferred_username,
            message: mychats,
            email: keycloak.keycloak?.tokenParsed?.email,
        };

        setMychats(""); // Clear input field after sending
        setChats((prevChats) => [...prevChats, chat]);

        socket?.emit("chat", chat); // Emit only the new chat message
    };

    useEffect(() => {
        socket?.on("chats", (data: Chats) => {
            setChats((prevChats) => [...prevChats, data]);
        });

        return () => {
            socket?.off("chat"); // Cleanup listener on component unmount
        };
    }, [socket]); // Only listen for socket changes

    return (
        <>
            {openchat ? (
                <div className="flex justify-center items-center h-screen bg-gray-100">
                    <div className="border-2 w-[22rem] h-[32rem] flex flex-col rounded-lg shadow-lg bg-white">
                        {/* Header */}
                        <div className="border-b-2 border-gray-300 h-[10%] w-full flex justify-between items-center px-2">
                            <div></div>
                            <h1 className="font-bold text-xl">Chats</h1>
                            <h1 className="cursor-pointer" onClick={()=>(setOpenchat(false))}>X</h1>
                        </div>

                        {/* Chat Body */}
                        <div className="h-[25rem] w-full p-4 flex flex-col justify-between">
                            <div className="chat-box bg-gray-200 h-[22rem] border rounded-lg p-2 flex flex-col overflow-y-auto">
                                {/* Chat messages */}
                                <div>
                                    {chats.map((chat, index) => (
                                        <div key={index} className={`flex items-center gap-1 ${keycloak.keycloak?.tokenParsed?.email === chat.email ? 'justify-end' : 'justify-start'}`}>
                                            {keycloak.keycloak?.tokenParsed?.email !== chat.email && (
                                                <div className="bg-white rounded-full h-8 w-8 mb-2 flex justify-center items-center">
                                                    {chat.name[0]}
                                                </div>
                                            )}
                                            <div className={`p-2 mb-2 rounded-lg max-w-[80%] ${keycloak.keycloak?.tokenParsed?.email === chat.email ? 'bg-black text-white self-start' : 'bg-gray-300 text-black'}`}>
                                                {chat.message}
                                            </div>
                                            {keycloak.keycloak?.tokenParsed?.email === chat.email && (
                                                <div className="bg-white rounded-full h-8 w-8 mb-2 flex justify-center items-center">
                                                    {chat.name[0]}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Input and Send Button */}
                            <div className="flex items-center justify-center mt-2">
                                <form action="" className="flex justify-center w-full" onSubmit={handleSend}>
                                    <input
                                        value={mychats}
                                        onChange={(e) => setMychats(e.target.value)}
                                        type="text"
                                        placeholder="Enter text..."
                                        className="p-2 text-lg w-[78%] border-2 border-gray-300 rounded-l-lg focus:outline-none"
                                    />
                                    <button
                                        className="w-[22%] bg-black text-white text-lg p-2 font-bold rounded-r-lg hover:bg-gray-800"
                                    >
                                        Send
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div onClick={()=>(setOpenchat(true))} className=" cursor-pointer shadow-lg h-20 w-20 rounded-full flex justify-center items-center">
                    <h1 className="font-bold text-xl">Chat</h1>
                </div>
            )}
        </>
    );
};

export default Chat;
