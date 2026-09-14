import Charts
import SwiftUI

struct SerieReviewsSection: View {
    @Environment(AppEnvironment.self) private var environment

    let serieId: String
    let reviews: [Review]
    let onChanged: () -> Void

    @State private var showingForm = false
    @State private var pendingDelete: Review?
    @State private var errorMessage: String?

    private var currentUserId: String? {
        if case .loggedIn(let user) = environment.session.state {
            return user.id
        }
        return nil
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Reseñas")
                    .font(.headline)

                Spacer()

                Button {
                    showingForm = true
                } label: {
                    Label("Escribir reseña", systemImage: "square.and.pencil")
                        .font(.subheadline)
                }
            }

            if reviews.isEmpty {
                Text("Todavía no hay reseñas.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(reviews) { review in
                    reviewCard(review)
                }
            }

            if let errorMessage {
                Text(errorMessage)
                    .font(.footnote)
                    .foregroundStyle(.red)
            }
        }
        .sheet(isPresented: $showingForm) {
            ReviewFormView(serieId: serieId) {
                onChanged()
            }
            .environment(environment)
        }
        .confirmationDialog(
            "¿Borrar tu reseña?",
            isPresented: Binding(
                get: { pendingDelete != nil },
                set: { if !$0 { pendingDelete = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button("Borrar", role: .destructive) {
                Task { await deleteReview() }
            }
        }
    }

    @ViewBuilder
    private func reviewCard(_ review: Review) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                Text(review.name ?? "Usuario")
                    .font(.subheadline.bold())

                if let level = review.userLevel {
                    Text(level)
                        .font(.caption2.bold())
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Capsule().fill(.quaternary))
                }

                Spacer()

                if let difficulty = review.difficulty {
                    DifficultyFlame(difficulty: Double(difficulty) * 2)
                        .font(.caption)
                }

                if let valoration = review.valoration, valoration > 0 {
                    StarRating(valoration: Double(valoration))
                }

                if review.user == currentUserId {
                    Button {
                        pendingDelete = review
                    } label: {
                        Image(systemName: "trash")
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                    .buttonStyle(.borderless)
                    .accessibilityLabel("Borrar reseña")
                }
            }

            if let comment = review.comment, !comment.isEmpty {
                Text(comment)
                    .font(.callout)
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(Color.secondary.opacity(0.1))
        )
    }

    private func deleteReview() async {
        guard let review = pendingDelete else { return }
        pendingDelete = nil

        do {
            try await environment.library.deleteReview(id: review.id)
            onChanged()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct SerieSpeedSection: View {
    @Environment(AppEnvironment.self) private var environment

    let serieId: String

    @State private var entries: [ProgressRecord] = []

    var body: some View {
        Group {
            if !entries.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Velocidad de lectura")
                        .font(.headline)

                    Chart(entries) { entry in
                        LineMark(
                            x: .value("Fecha", entry.endDate ?? entry.startDate ?? .now),
                            y: .value("Caracteres/hora", entry.meanReadSpeed ?? 0)
                        )
                        .foregroundStyle(Color.accentColor)

                        PointMark(
                            x: .value("Fecha", entry.endDate ?? entry.startDate ?? .now),
                            y: .value("Caracteres/hora", entry.meanReadSpeed ?? 0)
                        )
                        .foregroundStyle(Color.accentColor)
                    }
                    .frame(height: 200)
                    .chartYAxis {
                        AxisMarks(position: .leading)
                    }
                }
            }
        }
        .task(id: serieId) {
            entries = (try? await environment.progress.speed(serieId: serieId)) ?? []
        }
    }
}
