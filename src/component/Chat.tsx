import { useEffect, useRef, useState } from "react";
import { useSocket } from "../Hooks/UseSocket";
import Keycloak from 'keycloak-js';

import "./Chat.css"
interface Chats {
    name: string;
    message: string;
    email?: string // This should be a string instead of an array
}
interface props{
    keycloak : Keycloak
}
const Chat:React.FC<props> = ({keycloak})=> {
    const [openchat, setOpenchat] = useState<boolean>(false);
    const [mychats, setMychats] = useState<string>("");
    const [chats, setChats] = useState<Chats[]>([]);
    const socket = useSocket();

    const chatEndRef = useRef<HTMLDivElement>(null);  // Ref for the last message

    const handleSend = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!mychats.trim()) return; // Prevent sending empty messages

        const chat = {
            name: keycloak?.tokenParsed?.preferred_username,
            message: mychats,
            email: keycloak?.tokenParsed?.email,
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

    // Scroll to the last message
    // useEffect(() => {
    //     chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    // }, [chats]);

    return (
        <>
            {openchat ? (
                <div className="position-relative ">
                    <div className={`position-absolute top-10 start-52 translate-middle-x m-3 z-50 border-2 w-[22rem] h-[32rem] flex flex-col rounded-lg shadow-lg bg-white`}>
                        {/* Header */}
                        <div className="border-b-2 border-gray-300 h-[10%] w-full flex justify-between items-center px-2">
                            <div></div>
                            <h1 className="font-bold text-xl">Chats</h1>
                            <h1 className="cursor-pointer" onClick={() => setOpenchat(false)}>X</h1>
                        </div>

                        {/* Chat Body */}
                        <div className="h-[27rem] w-full p-4 flex flex-col justify-between">
                            <div className="chat-box bg-gray-200 h-[25rem] border rounded-lg p-2 flex flex-col overflow-y-auto">
                                {/* Chat messages */}
                                <div>
                                    {chats.map((chat, index) => (
                                        <div key={index} className={`flex items-center gap-1 ${keycloak?.tokenParsed?.email === chat.email ? 'justify-end' : 'justify-start'}`}>
                                            {keycloak?.tokenParsed?.email !== chat.email && (
                                                <div className="bg-white rounded-full h-8 w-8 mb-2 flex justify-center items-center">
                                                    {chat.name[0]}
                                                </div>
                                            )}
                                            <div className={`p-2 mb-2 rounded-lg max-w-[80%] ${keycloak?.tokenParsed?.email === chat.email ? 'bg-black text-white self-start' : 'bg-gray-300 text-black'}`}>
                                                {chat.message}
                                            </div>
                                            {keycloak?.tokenParsed?.email === chat.email && (
                                                <div className="bg-white rounded-full h-8 w-8 mb-2 flex justify-center items-center">
                                                    {chat.name[0]}
                                                </div>
                                            )}
                                        </div>

                                    ))}
                                    <div ref={chatEndRef} /> {/* Reference to the end of the chat */}
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
                null
            )}
            {!openchat ? (<div onClick={() => setOpenchat(true)} className="cursor-pointer shadow-lg h-20 w-20 rounded-full text-sm font-bold flex justify-center items-center">
                Open Chat
            </div>) : (null)}
        </>
    );
};

export default Chat;
