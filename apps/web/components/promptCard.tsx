export default function PromptCard({
    question,
    answer,
  }: {
    question: string;
    answer: string;
  }) {
    return (
      <div className="card p-6">
        <div className="text-sm text-pink-600 font-medium">
          {question}
        </div>
        <div className="mt-3 text-gray-800 text-lg">
          {answer}
        </div>
      </div>
    );
  }