import {PrismicMigratorAssets} from '../../../../asset/PrismicMigratorAssets';
import {AssetFile} from '@shared/types';

/**
 * Mock for PrismicMigratorAssets.
 * Allows simulating asset repository responses without making real API calls.
 *
 * Usage:
 *   const mock = new MockPrismicMigratorAssets();
 *   mock.setAssets('source-repo', [{ id: 'img-1', url: '...', filename: 'main.jpg', ... }]);
 *   const assets = await mock.getAssets('source-repo');
 */
export class MockPrismicMigratorAssets implements Partial<PrismicMigratorAssets> {
  private readonly assetsByRepo = new Map<string, AssetFile[]>();

  /**
   * Defines the list of assets for a given repository.
   * Returns this to allow method chaining (fluent API).
   */
  setAssets(repoName: string, assets: AssetFile[]): this {
    this.assetsByRepo.set(repoName, assets);
    return this;
  }

  /**
   * Retrieves all assets for a given repository.
   * Returns an empty array if no assets have been set for that repository.
   */
  async getAssets(repoName: string): Promise<AssetFile[]> {
    return this.assetsByRepo.get(repoName) ?? [];
  }

  /**
   * Resets the mock (useful for cleaning up between tests).
   */
  reset(): void {
    this.assetsByRepo.clear();
  }
}

