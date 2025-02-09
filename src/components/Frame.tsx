"use client";

import { useEffect, useCallback, useState } from "react";
import sdk, {
  AddFrame,
  SignIn as SignInCore,
  type Context,
} from "@farcaster/frame-sdk";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card";

import { config } from "~/components/providers/WagmiProvider";
import { truncateAddress } from "~/lib/truncateAddress";
import { base, optimism } from "wagmi/chains";
import { useSession } from "next-auth/react";
import { createStore } from "mipd";
import { Label } from "~/components/ui/label";
import { PROJECT_TITLE } from "~/lib/constants";

const QUESTIONS = [
  {
    question: "What can you build with Maschine right now?",
    options: [
      { text: "Frames with dynamic quizzes", correct: true },
      { text: "Database-backed applications", correct: false },
      { text: "New smart contracts", correct: false }
    ]
  },
  {
    question: "What's a current limitation?",
    options: [
      { text: "Interactive frames without backend", correct: false },
      { text: "Complex state management", correct: true },
      { text: "Basic UI components" , correct: false }
    ]
  },
  {
    question: "Which is possible today?",
    options: [
      { text: "User authentication", correct: true },
      { text: "On-chain transactions", correct: false },
      { text: "Real-time chat", correct: false }
    ]
  }
];

function QuizCard({ questions }: { questions: typeof QUESTIONS }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const handleAnswer = (optionIndex: number, isCorrect: boolean) => {
    setSelectedAnswer(optionIndex);
    if (isCorrect) setScore(s => s + 1);
    
    setTimeout(() => {
      setSelectedAnswer(null);
      setCurrentQuestionIndex(i => Math.min(i + 1, QUESTIONS.length - 1));
    }, 1500);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maschine Capabilities Quiz</CardTitle>
        <CardDescription>
          {currentQuestionIndex < QUESTIONS.length ? 
            `Question ${currentQuestionIndex + 1} of ${QUESTIONS.length}` :
            `Final Score: ${score}/${QUESTIONS.length}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {currentQuestionIndex < QUESTIONS.length ? (
          <>
            <Label className="text-lg">
              {QUESTIONS[currentQuestionIndex].question}
            </Label>
            <div className="flex flex-col gap-2">
              {QUESTIONS[currentQuestionIndex].options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i, option.correct)}
                  className={`p-2 rounded text-left ${
                    selectedAnswer === i 
                      ? option.correct 
                        ? "bg-green-200" 
                        : "bg-red-200"
                      : "hover:bg-gray-100"
                  }`}
                  disabled={selectedAnswer !== null}
                >
                  {option.text}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <Label className="text-lg block mb-4">Quiz Complete!</Label>
            <div className="text-sm text-gray-600">
              Maschine can handle interactive UI components and basic state,
              but complex applications still need traditional backends.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Frame() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<Context.FrameContext>();

  const [added, setAdded] = useState(false);

  const [addFrameResult, setAddFrameResult] = useState("");

  const addFrame = useCallback(async () => {
    try {
      await sdk.actions.addFrame();
    } catch (error) {
      if (error instanceof AddFrame.RejectedByUser) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      if (error instanceof AddFrame.InvalidDomainManifest) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      setAddFrameResult(`Error: ${error}`);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const context = await sdk.context;
      if (!context) {
        return;
      }

      setContext(context);
      setAdded(context.client.added);

      // If frame isn't already added, prompt user to add it
      if (!context.client.added) {
        addFrame();
      }

      sdk.on("frameAdded", ({ notificationDetails }) => {
        setAdded(true);
      });

      sdk.on("frameAddRejected", ({ reason }) => {
        console.log("frameAddRejected", reason);
      });

      sdk.on("frameRemoved", () => {
        console.log("frameRemoved");
        setAdded(false);
      });

      sdk.on("notificationsEnabled", ({ notificationDetails }) => {
        console.log("notificationsEnabled", notificationDetails);
      });
      sdk.on("notificationsDisabled", () => {
        console.log("notificationsDisabled");
      });

      sdk.on("primaryButtonClicked", () => {
        console.log("primaryButtonClicked");
      });

      console.log("Calling ready");
      sdk.actions.ready({});

      // Set up a MIPD Store, and request Providers.
      const store = createStore();

      // Subscribe to the MIPD Store.
      store.subscribe((providerDetails) => {
        console.log("PROVIDER DETAILS", providerDetails);
        // => [EIP6963ProviderDetail, EIP6963ProviderDetail, ...]
      });
    };
    if (sdk && !isSDKLoaded) {
      console.log("Calling load");
      setIsSDKLoaded(true);
      load();
      return () => {
        sdk.removeAllListeners();
      };
    }
  }, [isSDKLoaded, addFrame]);

  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      <div className="w-[300px] mx-auto py-2 px-2">
        <h1 className="text-2xl font-bold text-center mb-4 text-gray-700 dark:text-gray-300">
          {PROJECT_TITLE}
        </h1>
        <QuizCard questions={QUESTIONS} />
      </div>
    </div>
  );
}
