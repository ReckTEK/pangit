import type * as Contract from "../../fluent-api/mod.ts";
import type { FluentProviderTypes } from "../provider-types.ts";

export type Branch<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.Branch<TProvider, TVersion, FluentProviderTypes>;

export type Commit<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.Commit<TProvider, TVersion, FluentProviderTypes>;

export type CommitStatus<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CommitStatus<TProvider, TVersion, FluentProviderTypes>;

export type Content<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.Content<TProvider, TVersion, FluentProviderTypes>;

export type PullRequest<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.PullRequest<TProvider, TVersion, FluentProviderTypes>;

/** Immutable repository snapshot with concern-oriented capability handles. */
export type Repository<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.Repository<TProvider, TVersion, FluentProviderTypes>;

/** A fetched repository-owning user or organization. */
export type RepositoryContainer<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.RepositoryContainer<TProvider, TVersion, FluentProviderTypes>;

export type Tag<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.Tag<TProvider, TVersion, FluentProviderTypes>;

export type Blob<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.Blob<TProvider, TVersion, FluentProviderTypes>;

export type BranchRule<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.BranchRule<TProvider, TVersion, FluentProviderTypes>;

export type EffectiveBranchProtection<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.EffectiveBranchProtection<TProvider, TVersion, FluentProviderTypes>;

export type CiWorkflow<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CiWorkflow<TProvider, TVersion, FluentProviderTypes>;

export type CiRun<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CiRun<TProvider, TVersion, FluentProviderTypes>;

export type CiJob<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CiJob<TProvider, TVersion, FluentProviderTypes>;

export type CiArtifact<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CiArtifact<TProvider, TVersion, FluentProviderTypes>;

export type CurrentUserProfile<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CurrentUserProfile<TProvider, TVersion, FluentProviderTypes>;

export type Issue<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.Issue<TProvider, TVersion, FluentProviderTypes>;

export type IssueComment<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.IssueComment<TProvider, TVersion, FluentProviderTypes>;

export type PackageVersion<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.PackageVersion<TProvider, TVersion, FluentProviderTypes>;

export type PackageFile<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.PackageFile<TProvider, TVersion, FluentProviderTypes>;

export type PullRequestReview<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.PullRequestReview<TProvider, TVersion, FluentProviderTypes>;

export type Release<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.Release<TProvider, TVersion, FluentProviderTypes>;

export type ReleaseAsset<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.ReleaseAsset<TProvider, TVersion, FluentProviderTypes>;

/** Immutable normalized repository-webhook snapshot. */
export type RepositoryWebhook<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.RepositoryWebhook<TProvider, TVersion, FluentProviderTypes>;
