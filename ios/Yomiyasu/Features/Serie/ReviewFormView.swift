import SwiftUI

struct ReviewFormView: View {
    @Environment(AppEnvironment.self) private var environment
    @Environment(\.dismiss) private var dismiss

    let serieId: String
    let existing: Review?
    let onSubmitted: () -> Void

    @State private var level: ReviewLevel
    @State private var difficulty: Int
    @State private var valoration: Int
    @State private var comment: String
    @State private var isSaving = false
    @State private var errorMessage: String?

    init(serieId: String, existing: Review? = nil, onSubmitted: @escaping () -> Void) {
        self.serieId = serieId
        self.existing = existing
        self.onSubmitted = onSubmitted
        _level = State(initialValue: ReviewLevel(rawValue: existing?.userLevel ?? "") ?? .n3)
        _difficulty = State(initialValue: existing?.difficulty ?? 3)
        _valoration = State(initialValue: existing?.valoration ?? 0)
        _comment = State(initialValue: existing?.comment ?? "")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Tu nivel de japonés") {
                    Picker("Nivel", selection: $level) {
                        ForEach(ReviewLevel.allCases) { level in
                            Text(level.rawValue).tag(level)
                        }
                    }
                }

                Section("Dificultad (1-5)") {
                    Stepper("Dificultad: \(difficulty)", value: $difficulty, in: 1...5)
                }

                Section("Valoración") {
                    StarRatingInput(valoration: $valoration)
                }

                Section {
                    TextEditor(text: $comment)
                        .frame(minHeight: 100)
                        .onChange(of: comment) {
                            if comment.count > 500 {
                                comment = String(comment.prefix(500))
                            }
                        }
                } header: {
                    Text("Comentario")
                } footer: {
                    Text("\(comment.count)/500")
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle(existing == nil ? "Escribir reseña" : "Editar reseña")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await submit() }
                    } label: {
                        if isSaving {
                            ProgressView()
                        } else {
                            Text(existing == nil ? "Publicar" : "Guardar")
                        }
                    }
                    .disabled(isSaving)
                }
            }
        }
    }

    private func submit() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        do {
            let request = CreateReviewRequest(
                serie: serieId,
                userLevel: level.rawValue,
                difficulty: difficulty,
                valoration: valoration,
                comment: comment
            )

            if let existing {
                _ = try await environment.library.editReview(id: existing.id, request: request)
            } else {
                _ = try await environment.library.createReview(request)
            }
            onSubmitted()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct StarRatingInput: View {
    @Binding var valoration: Int

    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<5, id: \.self) { index in
                Image(systemName: symbol(at: index))
                    .font(.title3)
                    .foregroundStyle(.yellow)
                    .overlay {
                        HStack(spacing: 0) {
                            Color.clear
                                .contentShape(Rectangle())
                                .onTapGesture { valoration = index * 2 + 1 }
                            Color.clear
                                .contentShape(Rectangle())
                                .onTapGesture { valoration = index * 2 + 2 }
                        }
                    }
            }

            Text("\(valoration)/10")
                .font(.caption)
                .foregroundStyle(.secondary)

            if valoration > 0 {
                Button("Quitar") {
                    valoration = 0
                }
                .font(.caption)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Valoración \(valoration) de 10")
    }

    private func symbol(at index: Int) -> String {
        if valoration >= (index + 1) * 2 {
            return "star.fill"
        }
        if valoration == index * 2 + 1 {
            return "star.leadinghalf.filled"
        }
        return "star"
    }
}
